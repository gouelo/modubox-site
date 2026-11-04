"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** A form's button: disabled and "שומר…" while the form is sent, so nothing is sent twice. */
export function SubmitButton({ children, className = "btn-brand", pendingText = "שומר…", ...rest }: { children: ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} min-h-12 justify-center disabled:opacity-60`} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}
