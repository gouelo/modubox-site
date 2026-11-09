import { getDb } from "@/db";
import { ask } from "@/lib/admin/ask";
import { can } from "@/lib/admin/auth";
import { getSession } from "@/lib/admin/session";
import { rateLimiter } from "@/lib/leads";

// The AI question box on /admin/stats (src/lib/admin/ask.ts): a signed-in
// admin who may see orders asks; the answer reads the data read-only.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const allow = rateLimiter(30, 10 * 60_000);

/** Body: { question }. Answers { ok: true, answer } or { ok: false, error, message } (the message is for the box, in Hebrew). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "stats")) return json({ error: "unauthorized" }, 401);
  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    /* empty */
  }
  if (!question || question.length > 1000) return json({ ok: false, error: "invalid", message: "כתבו שאלה (עד 1,000 תווים)." }, 400);
  const db = getDb();
  if (!db) return json({ ok: false, error: "no_db", message: "אין חיבור למסד הנתונים." }, 503);
  if (!allow(session!.user)) return json({ ok: false, error: "rate_limited", message: "הרבה שאלות ברצף. נסו שוב בעוד כמה דקות." }, 429);
  return json(await ask(db, question));
}
