"use client";

import { useState } from "react";

/** Copies a text (a link) to the clipboard. */
export function CopyButton({ text, label = "העתקה", className = "btn-ghost min-h-11 px-4 text-sm" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("להעתקה:", text);
        }
      }}
    >
      {done ? "✓ הועתק" : label}
    </button>
  );
}
