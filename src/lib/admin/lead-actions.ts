"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { ActionState } from "./actions";
import { addLeadNote, changeLeadStatus, deleteLead, isLeadStatus, type LeadChange } from "./leads";
import { requireAdmin } from "./session";

/** The leads tab's server actions. Each one checks the session itself. */

const MESSAGES: Record<Exclude<LeadChange, { ok: true }>["error"], string> = {
  not_found: "הליד לא נמצא.",
  invalid: "משהו בפרטים לא תקין. בדקו ונסו שוב.",
};

async function run(id: number, fn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<LeadChange>): Promise<ActionState> {
  const db = getDb();
  if (!db) return { error: "מסד הנתונים לא מחובר." };
  const r = await fn(db);
  revalidatePath(`/admin/leads/${id}/`);
  revalidatePath("/admin/leads/");
  return r.ok ? { ok: true } : { error: MESSAGES[r.error] };
}

export async function leadStatusAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireAdmin("leads");
  const id = Number(form.get("id"));
  const to = form.get("to");
  if (!isLeadStatus(to)) return { error: MESSAGES.invalid };
  return run(id, (db) => changeLeadStatus(db, id, to, session.user));
}

export async function leadNoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireAdmin("leads");
  const id = Number(form.get("id"));
  return run(id, (db) => addLeadNote(db, id, String(form.get("text") ?? ""), session.user));
}

/** Deletes a lead (owner and sales; a soft delete, see deleteLead), then back to the list. */
export async function deleteLeadAction(form: FormData): Promise<void> {
  const session = await requireAdmin("delete_leads");
  const db = getDb();
  if (!db) throw new Error("no database");
  const r = await deleteLead(db, Number(form.get("id")), session.user);
  revalidatePath("/admin/", "layout");
  redirect(`/admin/leads/?deleted=${r.ok ? 1 : 0}`);
}
