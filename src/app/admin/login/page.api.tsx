import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { safeNext, sessionSecret } from "@/lib/admin/auth";
import { getSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "כניסה" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  const locked = !sessionSecret();
  return (
    <main className="grain flex min-h-dvh items-center justify-center bg-petrol px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.svg" alt="מודובוקס – Modubox" width={171} height={32} className="h-8 w-auto" />
          <span className="text-sm text-white/70">ממשק ניהול החנות</span>
        </div>
        <div className="rounded-xl2 bg-white p-6 shadow-lift">
          <h1 className="mb-4 text-xl font-extrabold">כניסה לניהול</h1>
          {locked ? (
            <p className="rounded-lg bg-copper-tint p-3 text-sm leading-6 text-copper-deep">
              הממשק נעול עד שתוגדר סיסמה: ב־Vercel → Settings → Environment Variables מוסיפים <b dir="ltr">ADMIN_PASSWORD</b>, ואז Redeploy.
            </p>
          ) : (
            <LoginForm next={next} />
          )}
        </div>
      </div>
    </main>
  );
}
