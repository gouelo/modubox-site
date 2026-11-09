"use client";

import { useState } from "react";

const EXAMPLES = ["כמה מחסנים 3×2 נמכרו בחודשיים האחרונים?", "השווה את המכירות של אוקטובר לנובמבר"];

/** The AI question box on /admin/stats: POST /api/admin/ask/ (src/lib/admin/ask.ts). */
export function AskBox({ enabled }: { enabled: boolean }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; error: boolean } | null>(null);

  if (!enabled) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-sand/60 p-4 text-sm leading-6 text-ink-soft">
        כדי לשאול שאלות צריך להגדיר מפתח של Anthropic: ב־Vercel, בפרויקט <b>modubox-site</b> → <b>Settings</b> → <b>Environment Variables</b>, להוסיף משתנה בשם <b dir="ltr">ANTHROPIC_API_KEY</b> (מפתח שיוצרים ב־console.anthropic.com), ואז לפרסם מחדש (Redeploy).
      </p>
    );
  }

  async function submit(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion(text);
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/admin/ask/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; answer?: string; message?: string };
      setAnswer(body.ok && body.answer ? { text: body.answer, error: false } : { text: body.message || "משהו השתבש. נסו שוב.", error: true });
    } catch {
      setAnswer({ text: "אין חיבור. נסו שוב.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="ask" className="sr-only">
          שאלה על הנתונים
        </label>
        <textarea
          id="ask"
          rows={2}
          maxLength={1000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(question);
            }
          }}
          placeholder="למשל: כמה הזמנות היו השבוע?"
          className="field min-h-12 flex-1 resize-none"
        />
        <button type="submit" disabled={busy || !question.trim()} className="btn-primary min-h-12 px-6 disabled:opacity-50">
          {busy ? "חושב…" : "שאלו"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={busy} onClick={() => submit(ex)} className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-ink-soft ring-1 ring-line transition hover:text-ink disabled:opacity-50">
            {ex}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {busy ? <p className="mt-3 text-sm text-ink-soft">בודק את הנתונים…</p> : null}
        {answer ? <p className={`mt-3 whitespace-pre-wrap rounded-xl p-4 text-[15px] leading-7 ${answer.error ? "bg-copper-tint text-copper-deep" : "bg-brand-tint text-ink"}`}>{answer.text}</p> : null}
      </div>
    </div>
  );
}
