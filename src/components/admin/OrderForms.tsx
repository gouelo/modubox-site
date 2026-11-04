"use client";

import { useActionState, useEffect, useRef } from "react";
import type { OrderStatus } from "@/db/schema";
import { addNoteAction, changeStatusAction, scheduleAction, type ActionState } from "@/lib/admin/actions";
import { STATUS_LABEL } from "@/lib/admin/status";
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

/** Cancelling or refunding asks first: it's easy to tap by mistake on a phone. */
const confirmText: Partial<Record<OrderStatus, string>> = {
  cancelled: "לבטל את ההזמנה? (אם שולמה, את הכסף מחזירים בפאנל של Z-Credit)",
  refunded: "לסמן שההזמנה זוכתה? אחרי זה אי אפשר לשנות אותה.",
};

/** The big "next step" button. */
export function NextStepButton({ id, to, label }: { id: string; to: OrderStatus; label: string }) {
  const [state, action] = useActionState(changeStatusAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton className="btn-brand w-full text-base">{label} ←</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

/** Any other move the rules allow. */
export function StatusSelect({ id, moves }: { id: string; moves: OrderStatus[] }) {
  const [state, action] = useActionState(changeStatusAction, {});
  if (!moves.length) return <p className="text-sm text-ink-soft">אין שינויי סטטוס אפשריים להזמנה הזו.</p>;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const to = new FormData(e.currentTarget).get("to") as OrderStatus;
        if (confirmText[to] && !window.confirm(confirmText[to])) e.preventDefault();
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor="status-to">
        סטטוס חדש
      </label>
      <select id="status-to" name="to" required className="field min-h-12 flex-1" defaultValue="">
        <option value="" disabled>
          בחרו סטטוס…
        </option>
        {moves.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <SubmitButton className="btn-ghost px-5">עדכון סטטוס</SubmitButton>
      <Feedback state={state} okText="עודכן" />
    </form>
  );
}

export function ScheduleForm({ id, date, note }: { id: string; date: string | null; note: string | null }) {
  const [state, action] = useActionState(scheduleAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">תאריך אספקה / התקנה</span>
          <input type="date" name="date" defaultValue={date ?? ""} className="field min-h-12" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">שעה או הערה לצוות (לא חובה)</span>
          <input name="note" defaultValue={note ?? ""} maxLength={200} placeholder="למשל: בוקר, 8 עד 12" className="field min-h-12" />
        </label>
      </div>
      <div className="flex gap-2">
        <SubmitButton className="btn-brand flex-1">שמירת מועד</SubmitButton>
        {date ? (
          <SubmitButton className="btn-ghost px-5" name="clear" value="1" pendingText="…">
            ביטול מועד
          </SubmitButton>
        ) : null}
      </div>
      <Feedback state={state} okText="המועד נשמר" />
    </form>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [state, action] = useActionState(addNoteAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor="note-text">
        הערה פנימית
      </label>
      <textarea id="note-text" name="text" required rows={2} maxLength={2000} placeholder="הערה פנימית (רק אתם רואים אותה)" className="field" />
      <SubmitButton className="btn-primary w-full sm:w-auto sm:px-6">הוספת הערה</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
