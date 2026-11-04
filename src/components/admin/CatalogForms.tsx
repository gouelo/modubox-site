"use client";

import { upload } from "@vercel/blob/client";
import { useId, useState } from "react";

/** A product's photos: addresses in order (the first is the main one), with uploads when a Blob store is connected. */
export function ImagesField({ name, initial, uploads }: { name: string; initial: string[]; uploads: boolean }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const src = (s: string) => (/^https?:/.test(s) ? s : `/_img/${s.replace(/^\/?(images\/)?/, "").replace(/\.\w+$/, "")}-480.webp`);
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setList(next);
  };
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-60) || "image";
        urls.push((await upload(`site/products/${safe}`, file, { access: "public", handleUploadUrl: "/api/admin/upload/" })).url);
      }
      setList((l) => [...l, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ההעלאה נכשלה");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(list)} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((s, i) => (
          <li key={`${s}-${i}`} className="overflow-hidden rounded-xl border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(s)} alt="" className="aspect-video w-full object-cover" />
            <div className="flex items-center gap-1 p-1.5 text-sm">
              {i === 0 ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand-dark">ראשית</span> : null}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full px-2 py-1 hover:bg-sand disabled:opacity-30" aria-label="קודם">
                →
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded-full px-2 py-1 hover:bg-sand disabled:opacity-30" aria-label="הבא">
                ←
              </button>
              <button type="button" onClick={() => setList(list.filter((_, k) => k !== i))} className="ms-auto rounded-full px-2 py-1 text-rose-700 hover:bg-sand">
                הסרה
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {uploads ? (
          <>
            <label htmlFor={id} className="btn-ghost min-h-11 cursor-pointer px-4 text-sm">
              {busy ? "מעלה…" : "העלאת תמונות"}
            </label>
            <input id={id} type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
          </>
        ) : null}
        <AddUrl onAdd={(u) => setList([...list, u])} />
      </div>
      {error ? <p className="mt-1 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

function AddUrl({ onAdd }: { onAdd: (u: string) => void }) {
  const [v, setV] = useState("");
  return (
    <span className="flex flex-1 gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="https://… או photos/…" className="field min-w-0 flex-1 py-2" dir="ltr" aria-label="כתובת תמונה" />
      <button
        type="button"
        onClick={() => {
          if (v.trim()) onAdd(v.trim());
          setV("");
        }}
        className="btn-ghost min-h-11 px-4 text-sm"
      >
        הוספה
      </button>
    </span>
  );
}
