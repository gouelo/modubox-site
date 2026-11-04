"use client";

import { useActionState, useEffect, useRef } from "react";
import type { LeadStatus } from "@/db/schema";
import type { ActionState } from "@/lib/admin/actions";
import { leadNoteAction, leadStatusAction } from "@/lib/admin/lead-actions";
import { LEAD_STATUS_LABEL as labels } from "@/lib/admin/lead-status";
import { SubmitButton } from "./SubmitButton";

function Feedback({ state, okText }: { state: ActionState; okText?: string }) {
  if (state.error)
    return (
      <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        {state.error}
      </p>
    );
  if (state.ok && okText)
    return (
      <p role="status" className="mt-2 text-sm font-semibold text-emerald-700">
        ✓ {okText}
      </p>
    );
  return null;
}

/** One tap per status: the current one is marked. */
export function LeadStatusButtons({ id, status }: { id: number; status: LeadStatus }) {
  const [state, action] = useActionState(leadStatusAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(labels) as LeadStatus[]).map((s) => (
          <SubmitButton key={s} name="to" value={s} pendingText="…" aria-pressed={s === status} className={s === status ? "btn-primary min-h-12 text-sm" : "btn-ghost min-h-12 text-sm"}>
            {s === status ? "✓ " : ""}
            {labels[s]}
          </SubmitButton>
        ))}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LeadNoteForm({ id }: { id: number }) {
  const [state, action] = useActionState(leadNoteAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor="lead-note">
        הערה פנימית
      </label>
      <textarea id="lead-note" name="text" required rows={2} maxLength={2000} placeholder="הערה פנימית, למשל: דיברנו, חוזר אליו ביום ראשון" className="field" />
      <SubmitButton className="btn-primary w-full sm:w-auto sm:px-6">הוספת הערה</SubmitButton>
      <Feedback state={state} okText="נשמר" />
    </form>
  );
}
