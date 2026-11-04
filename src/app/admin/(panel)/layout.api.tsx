import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/lib/admin/actions";
import { ALL_PERMISSIONS, can } from "@/lib/admin/auth";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/** Every admin page but the sign-in: the session checked again here, the top bar and the navigation. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const perms = ALL_PERMISSIONS.filter((p) => can(session, p));
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-30 bg-petrol text-white shadow-soft">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href={can(session, "orders") ? "/admin/" : "/admin/content/"} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.svg" alt="מודובוקס" width={171} height={32} className="h-6 w-auto" />
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-glow">ניהול</span>
          </Link>
          <AdminNav perms={perms} />
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noopener" className="hidden rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 sm:block">
              לאתר ↗
            </a>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                יציאה
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-5">{children}</main>
    </div>
  );
}
