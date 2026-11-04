"use client";

import { upload } from "@vercel/blob/client";
import { useActionState, useId, useState, type ReactNode } from "react";
import type { ActionState } from "@/lib/admin/actions";
import { savePageAction, savePostAction } from "@/lib/admin/content-actions";
import { Markdown } from "@/lib/markdown";
import { SubmitButton } from "./SubmitButton";

/** The content module's forms (client side: counters, previews, lists of rows, uploads). */

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function Feedback({ state, okText = "נשמר. האתר יתעדכן בכניסה הבאה לדף." }: { state: ActionState; okText?: string }) {
  if (state.error)
    return (
      <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">
        ✓ {state.message ?? okText}
      </p>
    );
  return null;
}

/** A form for any content action: the fields come from the (server) page. */
export function ActionForm({ action, children, submit = "שמירה", okText, className = "", confirm }: { action: Action; children?: ReactNode; submit?: string; okText?: string; className?: string; confirm?: string }) {
  const [state, act] = useActionState(action, {});
  return (
    <form action={act} className={className} onSubmit={(e) => confirm && !window.confirm(confirm) && e.preventDefault()}>
      {children}
      <div className="mt-4">
        <SubmitButton className="btn-brand">{submit}</SubmitButton>
      </div>
      <Feedback state={state} okText={okText} />
    </form>
  );
}

export function Field({ label, hint, children, counter }: { label: string; hint?: ReactNode; children: ReactNode; counter?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-bold">
        {label}
        {counter}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs leading-5 text-ink-soft">{hint}</span> : null}
    </label>
  );
}

function Counter({ value, ideal: [min, max] }: { value: string; ideal: [number, number] }) {
  const n = [...value].length;
  if (!n) return <span className="text-xs font-normal text-ink-soft">ברירת המחדל</span>;
  const tone = n > max ? "text-rose-700" : n < min ? "text-amber-700" : "text-emerald-700";
  return (
    <span className={`text-xs font-semibold ${tone}`} dir="ltr">
      {n} / {max}
    </span>
  );
}

/** An image: an address, or (with a Blob store) a file uploaded from the phone or computer. */
export function ImageField({ name, label, defaultValue = "", uploads, hint }: { name: string; label: string; defaultValue?: string; uploads: boolean; hint?: ReactNode }) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-60) || "image";
      const blob = await upload(`site/${safe}`, file, { access: "public", handleUploadUrl: "/api/admin/upload/" });
      setUrl(blob.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ההעלאה נכשלה");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Field label={label} hint={hint ?? (uploads ? "כתובת של תמונה, או העלאה מהמכשיר." : "כתובת מלאה של תמונה (https://…) או נתיב באתר (/images/…). להעלאת קבצים צריך לחבר Vercel Blob.")}>
        <input name={name} value={url} onChange={(e) => setUrl(e.target.value)} className="field" dir="ltr" placeholder="https://…" />
      </Field>
      {uploads ? (
        <div className="mt-2 flex items-center gap-3">
          <label htmlFor={id} className="btn-ghost min-h-11 cursor-pointer px-4 text-sm">
            {busy ? "מעלה…" : "העלאת תמונה"}
          </label>
          <input id={id} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="h-12 w-20 rounded-lg object-cover ring-1 ring-line" /> : null}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

/** Rows of two fields (key facts, questions and answers): add, remove, reorder. */
function Pairs({ rows, setRows, labels, long = false, max }: { rows: [string, string][]; setRows: (r: [string, string][]) => void; labels: [string, string]; long?: boolean; max: number }) {
  const set = (i: number, j: 0 | 1, v: string) => setRows(rows.map((r, k) => (k === i ? ((j === 0 ? [v, r[1]] : [r[0], v]) as [string, string]) : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRows(next);
  };
  return (
    <div className="grid gap-3">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-line bg-sand/40 p-3">
          <input value={r[0]} onChange={(e) => set(i, 0, e.target.value)} className="field" placeholder={labels[0]} aria-label={`${labels[0]} ${i + 1}`} />
          {long ? (
            <textarea value={r[1]} onChange={(e) => set(i, 1, e.target.value)} className="field min-h-24" placeholder={labels[1]} aria-label={`${labels[1]} ${i + 1}`} />
          ) : (
            <input value={r[1]} onChange={(e) => set(i, 1, e.target.value)} className="field" placeholder={labels[1]} aria-label={`${labels[1]} ${i + 1}`} />
          )}
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full px-3 py-1.5 hover:bg-white disabled:opacity-30" aria-label="למעלה">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded-full px-3 py-1.5 hover:bg-white disabled:opacity-30" aria-label="למטה">
              ↓
            </button>
            <button type="button" onClick={() => setRows(rows.filter((_, k) => k !== i))} className="ms-auto rounded-full px-3 py-1.5 font-semibold text-rose-700 hover:bg-white">
              הסרה
            </button>
          </div>
        </div>
      ))}
      {rows.length < max ? (
        <button type="button" onClick={() => setRows([...rows, ["", ""]])} className="btn-ghost min-h-11 justify-self-start px-4 text-sm">
          + הוספה
        </button>
      ) : null}
    </div>
  );
}

export interface PageFormProps {
  path: string;
  url: string;
  kind: "page" | "product" | "post";
  defaults: { title: string; description: string };
  value: { title: string; description: string; ogImage: string; canonical: string; noindex: boolean; keyFacts: { label: string; value: string }[] };
  faqs: { q: string; a: string }[] | null;
  uploads: boolean;
}

/** One page's search and sharing settings, with a Google-style preview. */
export function PageSeoForm({ path, url, kind, defaults, value, faqs, uploads }: PageFormProps) {
  const [state, act] = useActionState(savePageAction, {});
  const [title, setTitle] = useState(value.title);
  const [description, setDescription] = useState(value.description);
  const [facts, setFacts] = useState<[string, string][]>(value.keyFacts.map((f) => [f.label, f.value]));
  const [qa, setQa] = useState<[string, string][]>((faqs ?? []).map((f) => [f.q, f.a]));
  const shownTitle = title.trim() || defaults.title;
  const shownDescription = description.trim() || defaults.description;
  return (
    <form action={act} className="grid gap-5">
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="facts" value={JSON.stringify(facts.map(([label, v]) => ({ label, value: v })))} />
      {faqs ? <input type="hidden" name="faqs" value={JSON.stringify(qa.map(([q, a]) => ({ q, a })))} /> : null}

      <div className="rounded-xl border border-line bg-white p-4" aria-label="תצוגה בגוגל">
        <p className="text-xs text-ink-soft">כך זה ייראה בגוגל (בערך)</p>
        <p className="mt-2 truncate text-sm text-[#202124]" dir="ltr">
          {url}
        </p>
        <p className="mt-0.5 line-clamp-1 text-lg text-[#1a0dab]">{shownTitle}</p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-[#4d5156]">{shownDescription}</p>
      </div>

      <Field label="כותרת לגוגל (title)" counter={<Counter value={title} ideal={[30, 60]} />} hint={<>ריק = ברירת המחדל: “{defaults.title}”. מה שכותבים כאן מוצג כמו שהוא, בלי תוספת שם האתר.</>}>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder={defaults.title} />
      </Field>
      <Field label="תיאור (meta description)" counter={<Counter value={description} ideal={[110, 160]} />} hint="ריק = ברירת המחדל. מומלץ 120–160 תווים, עם מה שמבדל ומה עושים הלאה.">
        <textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} className="field min-h-28" placeholder={defaults.description} />
      </Field>
      <ImageField name="ogImage" label="תמונה לשיתוף (Open Graph)" defaultValue={value.ogImage} uploads={uploads} hint="מוצגת כשמשתפים את הדף בוואטסאפ, בפייסבוק ועוד. מומלץ 1200×630. ריק = ברירת המחדל." />
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-bold">מתקדם: canonical ו־noindex</summary>
        <div className="mt-4 grid gap-4">
          <Field label="כתובת קנונית (canonical)" hint="רק אם התוכן של הדף הזה זהה לדף אחר. ריק = הדף עצמו.">
            <input name="canonical" defaultValue={value.canonical} className="field" dir="ltr" placeholder={path} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="noindex" defaultChecked={value.noindex} className="mt-1 size-5 accent-brand-dark" />
            <span>
              <b>להסתיר מגוגל (noindex)</b>
              <br />
              <span className="text-ink-soft">הדף נשאר באתר, אבל מנועי חיפוש לא יציגו אותו, והוא יוצא מה־sitemap.</span>
            </span>
          </label>
        </div>
      </details>

      {kind === "product" ? (
        <fieldset className="grid gap-3">
          <legend className="text-base font-extrabold">עובדות עיקריות</legend>
          <p className="text-sm text-ink-soft">שורות קצרות שמופיעות בדף המוצר ובנתונים המובנים שלו, למשל “חומר: פנל מבודד 5 ס&quot;מ”. מנועי AI אוהבים עובדות ברורות.</p>
          <Pairs rows={facts} setRows={setFacts} labels={["כותרת (למשל: חומר)", "ערך (למשל: פנל מבודד 5 ס\"מ)"]} max={20} />
        </fieldset>
      ) : null}

      {faqs ? (
        <fieldset className="grid gap-3">
          <legend className="text-base font-extrabold">שאלות ותשובות בדף</legend>
          <p className="text-sm text-ink-soft">מופיעות בסוף הדף, עם סימון FAQPage לגוגל ולמנועי AI. תשובה ישירה במשפט־שניים עובדת הכי טוב.</p>
          <Pairs rows={qa} setRows={setQa} labels={["שאלה", "תשובה"]} long max={30} />
        </fieldset>
      ) : null}

      <div>
        <SubmitButton className="btn-brand">שמירה</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export interface PostFormProps {
  post: { slug: string; title: string; seoTitle: string; description: string; date: string; updated: string; cover: string; coverAlt: string; categories: string; body: string; status: string };
  previousSlug: string;
  uploads: boolean;
}

/** A blog post: its fields and the Markdown body, with a preview. */
export function PostForm({ post, previousSlug, uploads }: PostFormProps) {
  const [state, act] = useActionState(savePostAction, {});
  const [body, setBody] = useState(post.body);
  const [preview, setPreview] = useState(false);
  return (
    <form action={act} className="grid gap-5">
      <input type="hidden" name="previousSlug" value={previousSlug} />
      <Field label="כותרת">
        <input name="title" defaultValue={post.title} required className="field text-lg font-bold" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="כתובת (slug)" hint={previousSlug ? "שינוי הכתובת יוסיף הפניה 301 מהכתובת הקודמת." : "ריק = מהכותרת."}>
          <input name="slug" defaultValue={post.slug} className="field" />
        </Field>
        <Field label="מצב">
          <select name="status" defaultValue={post.status} className="field">
            <option value="published">מפורסם</option>
            <option value="draft">טיוטה (לא באתר)</option>
            <option value="hidden">מוסתר</option>
          </select>
        </Field>
        <Field label="תאריך פרסום">
          <input type="date" name="date" defaultValue={post.date} required className="field" />
        </Field>
        <Field label="עודכן בתאריך" hint="ריק = כמו תאריך הפרסום.">
          <input type="date" name="updated" defaultValue={post.updated} className="field" />
        </Field>
      </div>
      <Field label="כותרת לגוגל" hint="ריק = הכותרת.">
        <input name="seoTitle" defaultValue={post.seoTitle} className="field" />
      </Field>
      <Field label="תיאור" hint="מופיע בגוגל, בשיתוף וברשימת המאמרים. 120–160 תווים.">
        <textarea name="description" defaultValue={post.description} className="field min-h-24" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ImageField name="cover" label="תמונה ראשית" defaultValue={post.cover} uploads={uploads} />
        <Field label="תיאור התמונה (alt)">
          <input name="coverAlt" defaultValue={post.coverAlt} className="field" />
        </Field>
      </div>
      <Field label="קטגוריות" hint="מופרדות בפסיק.">
        <input name="categories" defaultValue={post.categories} className="field" />
      </Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-bold">תוכן (Markdown)</span>
          <button type="button" onClick={() => setPreview(!preview)} className="rounded-full px-3 py-1 text-sm font-semibold text-brand-dark hover:bg-sand">
            {preview ? "עריכה" : "תצוגה מקדימה"}
          </button>
        </div>
        <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} className={`field min-h-[28rem] font-mono text-sm leading-6 ${preview ? "hidden" : ""}`} />
        {preview ? (
          <div className="rounded-xl border border-line bg-white p-5">
            <Markdown source={body} locale="he" />
          </div>
        ) : null}
        <p className="mt-1 text-xs leading-5 text-ink-soft">## כותרת · **מודגש** · [קישור](/shop/) · - רשימה · שורת תמונה: ![תיאור](https://…)</p>
      </div>
      <div>
        <SubmitButton className="btn-brand">שמירה</SubmitButton>
        <Feedback state={state} okText="נשמר. הפוסט יתעדכן באתר בכניסה הבאה." />
      </div>
    </form>
  );
}

/** A form that asks before it sends (deleting, reverting). */
export function ConfirmForm({ action, confirm, children, className = "" }: { action: (form: FormData) => Promise<void>; confirm: string; children: ReactNode; className?: string }) {
  return (
    <form action={action} className={className} onSubmit={(e) => !window.confirm(confirm) && e.preventDefault()}>
      {children}
    </form>
  );
}
