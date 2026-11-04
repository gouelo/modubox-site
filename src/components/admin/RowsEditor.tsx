"use client";

import { useState } from "react";

/**
 * A list of rows to edit, reorder, hide, remove and add (reviews, FAQ
 * questions). The rows go to the server action as JSON in a hidden field.
 */

export interface RowField {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "date" | "rating";
  dir?: "ltr" | "rtl";
  /** inside the row's "English" box */
  en?: boolean;
}

type Row = Record<string, unknown> & { hidden?: boolean; en?: Record<string, string> };

const get = (r: Row, f: RowField) => String((f.en ? r.en?.[f.key] : r[f.key]) ?? "");

export function RowsEditor({ name, initial, fields, title, empty, addLabel = "+ הוספה" }: { name: string; initial: Row[]; fields: RowField[]; title: (r: Row, i: number) => string; empty: Row; addLabel?: string }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [open, setOpen] = useState<number | null>(null);
  const set = (i: number, f: RowField, v: string) =>
    setRows((rs) => rs.map((r, j) => (j !== i ? r : f.en ? { ...r, en: { ...(r.en ?? {}), [f.key]: v } } : { ...r, [f.key]: f.kind === "rating" ? Number(v) : v })));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const out = [...rs];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  const input = (r: Row, i: number, f: RowField) => {
    const common = { value: get(r, f), onChange: (e: { target: { value: string } }) => set(i, f, e.target.value), className: "field", dir: f.dir, "aria-label": `${f.label} ${i + 1}` };
    if (f.kind === "textarea") return <textarea {...common} className="field min-h-28" />;
    if (f.kind === "date") return <input type="date" {...common} dir="ltr" />;
    if (f.kind === "rating")
      return (
        <select {...common}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)} ({n})
            </option>
          ))}
        </select>
      );
    return <input {...common} />;
  };
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <ol className="grid gap-2">
        {rows.map((r, i) => (
          <li key={i} className={`rounded-xl border border-line ${r.hidden ? "bg-sand/60 opacity-70" : "bg-white"}`}>
            <div className="flex items-center gap-2 p-3">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="min-w-0 flex-1 text-start" aria-expanded={open === i}>
                <span className="block truncate font-bold">{title(r, i) || "(חדש)"}</span>
                {r.hidden ? <span className="text-xs text-ink-soft">מוסתר</span> : null}
              </button>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-ghost min-h-9 px-2.5 text-sm" aria-label={`למעלה ${i + 1}`}>
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="btn-ghost min-h-9 px-2.5 text-sm" aria-label={`למטה ${i + 1}`}>
                ↓
              </button>
            </div>
            {open === i ? (
              <div className="grid gap-3 border-t border-line p-3">
                {fields
                  .filter((f) => !f.en)
                  .map((f) => (
                    <label key={f.key} className="block text-sm">
                      <span className="mb-1 block font-bold">{f.label}</span>
                      {input(r, i, f)}
                    </label>
                  ))}
                {fields.some((f) => f.en) ? (
                  <details className="rounded-lg border border-line p-3">
                    <summary className="cursor-pointer text-sm font-bold">באנגלית</summary>
                    <div className="mt-3 grid gap-3">
                      {fields
                        .filter((f) => f.en)
                        .map((f) => (
                          <label key={f.key} className="block text-sm">
                            <span className="mb-1 block font-bold">{f.label}</span>
                            {input(r, i, f)}
                          </label>
                        ))}
                    </div>
                  </details>
                ) : null}
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!r.hidden} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, hidden: e.target.checked || undefined } : x)))} className="size-5 accent-brand-dark" />
                    הסתרה מהאתר
                  </label>
                  <button type="button" className="font-semibold text-rose-700 underline" onClick={() => (setRows((rs) => rs.filter((_, j) => j !== i)), setOpen(null))}>
                    מחיקה
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <button type="button" className="btn-ghost mt-3 min-h-11 px-4 text-sm" onClick={() => (setRows((rs) => [...rs, structuredClone(empty)]), setOpen(rows.length))}>
        {addLabel}
      </button>
    </div>
  );
}
