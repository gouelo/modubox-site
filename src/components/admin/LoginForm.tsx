"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/admin/actions";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">סיסמה</span>
        <input type="password" name="password" required autoFocus autoComplete="current-password" className="field min-h-12" dir="ltr" aria-invalid={!!state.error || undefined} aria-describedby={state.error ? "login-error" : undefined} />
      </label>
      {state.error ? (
        <p id="login-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="btn-brand w-full text-base" pendingText="נכנסים…">
        כניסה
      </SubmitButton>
    </form>
  );
}
