"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { addNote, changeStatus, setSchedule, type ChangeResult } from "../orders";
import { ADMIN_COOKIE, checkPassword, createSessionToken, safeNext, SESSION_DAYS, sessionSecret } from "./auth";
import { requireAdmin } from "./session";
import { isStatus } from "./status";

/** The admin's server actions. Each one checks the session itself. */

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** shown on success */
  message?: string;
}

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const secret = sessionSecret();
  if (!secret) return { error: "הממשק נעול: עוד לא הוגדרה סיסמה (ADMIN_PASSWORD ב־Vercel)." };
  if (!(await checkPassword(String(form.get("password") ?? "")))) {
    // a little slower for guessing
    await new Promise((r) => setTimeout(r, 600));
    return { error: "הסיסמה לא נכונה. נסו שוב." };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await createSessionToken(secret, "admin", "owner"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect(safeNext(form.get("next")));
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login/");
}

const MESSAGES: Record<Exclude<ChangeResult, { ok: true }>["error"], string> = {
  not_found: "ההזמנה לא נמצאה.",
  not_allowed: "אי אפשר לבצע את השינוי הזה בהזמנה במצב הנוכחי שלה.",
  needs_date: "קודם קובעים מועד אספקה (למטה, ב'אספקה והתקנה').",
  invalid: "משהו בפרטים לא תקין. בדקו ונסו שוב.",
};

async function run(id: string, fn: () => Promise<ChangeResult>): Promise<ActionState> {
  const r = await fn();
  revalidatePath(`/admin/orders/${id}/`);
  return r.ok ? { ok: true } : { error: MESSAGES[r.error] };
}

function dbOrError() {
  const db = getDb();
  if (!db) throw new Error("no database");
  return db;
}

export async function changeStatusAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireAdmin("orders");
  const id = String(form.get("id") ?? "");
  const to = form.get("to");
  if (!isStatus(to)) return { error: MESSAGES.invalid };
  return run(id, () => changeStatus(dbOrError(), id, to, session.user));
}

export async function addNoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireAdmin("orders");
  const id = String(form.get("id") ?? "");
  return run(id, () => addNote(dbOrError(), id, String(form.get("text") ?? ""), session.user));
}

export async function scheduleAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireAdmin("orders");
  const id = String(form.get("id") ?? "");
  const clear = form.get("clear") === "1";
  const date = clear ? null : String(form.get("date") ?? "");
  if (!clear && !date) return { error: "בחרו תאריך." };
  return run(id, () => setSchedule(dbOrError(), id, date, String(form.get("note") ?? ""), session.user));
}
