"use client";

import type { FaqRow, ReviewRow } from "@/lib/catalog-overrides";
import { RowsEditor, type RowField } from "./RowsEditor";

/** The FAQ and reviews editors (client side: their rows are a list in the browser). */

const FAQ_FIELDS: RowField[] = [
  { key: "q", label: "שאלה" },
  { key: "a", label: "תשובה", kind: "textarea" },
  { key: "q", label: "Question", en: true, dir: "ltr" },
  { key: "a", label: "Answer", kind: "textarea", en: true, dir: "ltr" },
];

export function FaqRows({ id, rows }: { id: string; rows: FaqRow[] }) {
  return <RowsEditor name={`rows_${id}`} initial={rows as never} fields={FAQ_FIELDS} title={(r) => String(r.q ?? "")} empty={{ q: "", a: "", en: { q: "", a: "" } }} addLabel="+ שאלה חדשה" />;
}

const REVIEW_FIELDS: RowField[] = [
  { key: "name", label: "שם" },
  { key: "date", label: "תאריך", kind: "date" },
  { key: "rating", label: "דירוג", kind: "rating" },
  { key: "text", label: "הביקורת", kind: "textarea" },
  { key: "name", label: "Name", en: true, dir: "ltr" },
  { key: "text", label: "Review (English)", kind: "textarea", en: true, dir: "ltr" },
];

export function ReviewRows({ rows }: { rows: ReviewRow[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return <RowsEditor name="rows" initial={rows as never} fields={REVIEW_FIELDS} title={(r) => `${"★".repeat(Number(r.rating) || 0)} ${r.name ?? ""}`} empty={{ name: "", date: today, rating: 5, text: "", en: { name: "", text: "" } }} addLabel="+ ביקורת חדשה" />;
}
