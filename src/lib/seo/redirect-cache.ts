import { getDb } from "@/db";
import { redirects } from "@/db/schema";
import { compileRules, fileRules, mergeRules, type CompiledRule } from "./redirects";

/**
 * The proxy's redirects, kept in memory and read again from the database at
 * most once a minute (in the background: a request never waits for it, but
 * the first one in a new instance, for up to 1.5 seconds). Without the
 * database, or when it fails: the file's redirects.
 */
const TTL_MS = 60_000;
const FIRST_WAIT_MS = 1500;

const fallback = compileRules(fileRules());
type Loaded = { rules: CompiledRule[]; at: number };
let current: Loaded | null = null;
let loading: Promise<void> | null = null;

async function load(): Promise<void> {
  const db = getDb();
  if (!db) {
    current = { rules: fallback, at: Date.now() };
    return;
  }
  try {
    const rows = await db.select().from(redirects);
    current = { rules: compileRules(mergeRules(fileRules(), rows)), at: Date.now() };
  } catch (e) {
    console.error("[redirects] table not read, file redirects used:", e instanceof Error ? e.message : e);
    current = { rules: current?.rules ?? fallback, at: Date.now() };
  }
}

function refresh(): Promise<void> {
  loading ??= load().finally(() => {
    loading = null;
  });
  return loading;
}

export async function redirectRules(): Promise<CompiledRule[]> {
  if (current && Date.now() - current.at < TTL_MS) return current.rules;
  const p = refresh();
  if (current) return current.rules;
  await Promise.race([p, new Promise((r) => setTimeout(r, FIRST_WAIT_MS))]);
  // load() may have set it while we waited
  return (current as Loaded | null)?.rules ?? fallback;
}

/** After an admin save in this instance: read again on the next request. */
export function expireRedirects() {
  if (current) current.at = 0;
}
