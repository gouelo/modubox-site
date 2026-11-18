"use client";

import { useActionState, useEffect, useRef } from "react";
import type { OrderStatus } from "@/db/schema";
import { addNoteAction, changeStatusAction, editCustomerAction, type ActionState } from "@/lib/admin/actions";
import type { CustomerDetails } from "@/lib/orders";
import { Field } from "./ContentForms";
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

/** Cancelling asks first: it's easy to tap by mistake on a phone. */
const confirmText: Partial<Record<OrderStatus, string>> = {
  cancelled: "לבטל את ההזמנה? (אם שולמה, את הכסף מחזירים בפאנל של Z-Credit)",
};

/** The moves the rules allow: new ⇄ cancelled. */
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

/** Corrects the customer's details on an order not yet paid (a mistyped phone, say). Closed until opened. */
export function EditCustomerForm({ id, details }: { id: string; details: CustomerDetails }) {
  const [state, action] = useActionState(editCustomerAction, {});
  return (
    <details className="mt-3 rounded-lg ring-1 ring-line" open={!!state.error || undefined}>
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-brand-dark">✏️ עריכת פרטי הלקוח</summary>
      <form action={action} className="grid gap-3 p-3 pt-1 sm:grid-cols-2">
        <input type="hidden" name="id" value={id} />
        <Field label="שם מלא">
          <input name="name" required defaultValue={details.name} className="field" autoComplete="off" />
        </Field>
        <Field label="טלפון">
          <input name="phone" required defaultValue={details.phone} className="field" dir="ltr" inputMode="tel" autoComplete="off" placeholder="050-1234567 / +972 50-123-4567" />
        </Field>
        <Field label="מייל (לא חובה)">
          <input name="email" type="email" defaultValue={details.email} className="field" dir="ltr" autoComplete="off" />
        </Field>
        <Field label="יישוב">
          <input name="city" defaultValue={details.city} className="field" autoComplete="off" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="כתובת">
            <input name="address" defaultValue={details.address} className="field" autoComplete="off" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="הערות הלקוח">
            <textarea name="notes" defaultValue={details.notes} className="field min-h-20" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <SubmitButton className="btn-primary w-full sm:w-auto sm:px-6">שמירת הפרטים</SubmitButton>
          <Feedback state={state} okText={state.message} />
        </div>
      </form>
    </details>
  );
}
