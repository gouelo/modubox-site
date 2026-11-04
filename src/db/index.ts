import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The database connection, server code only. Neon from the Vercel Marketplace
 * puts DATABASE_URL (pooled) into the project's environment by itself. With a
 * custom prefix the names change (prefix DATABASE: DATABASE_URL stays,
 * POSTGRES_URL becomes DATABASE_POSTGRES_URL), so those are read too.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.DATABASE_URL || env.DATABASE_POSTGRES_URL || env.POSTGRES_URL || "").trim();
}

let cached: Db | null | undefined;

/** The database, or null when none is connected yet (the site then works as before: orders only in the logs). */
export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = databaseUrl();
  if (!url) return (cached = null);
  const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  // Vercel functions: close idle connections before the instance is suspended
  attachDatabasePool(pool);
  return (cached = drizzle(pool, { schema }) as unknown as Db);
}
