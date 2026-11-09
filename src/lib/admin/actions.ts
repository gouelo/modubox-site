"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { addNote, changeStatus, deleteOrders, type ChangeResult } from "../orders";
import { ADMIN_COOKIE, createSessionToken, passwordRole, safeNext, SESSION_DAYS, sessionSecret } from "./auth";
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
  const who = await passwordRole(String(form.get("password") ?? ""));
  if (!who) {
    // a little slower for guessing
    await new Promise((r) => setTimeout(r, 600));
    return { error: "הסיסמה לא נכונה. נסו שוב." };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await createSessionToken(secret, who.user, who.role), {
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

/** Deletes orders for good (the owner only): one from its page, or several picked in the list. Then back to the list. */
export async function deleteOrdersAction(form: FormData): Promise<void> {
  const session = await requireAdmin("delete_orders");
  const ids = form.getAll("id").map(String);
  const n = await deleteOrders(dbOrError(), ids, session.user);
  revalidatePath("/admin/", "layout");
  redirect(`/admin/orders/?deleted=${n}`);
}
