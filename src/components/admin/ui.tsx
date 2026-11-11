import Link from "next/link";
import type { ReactNode } from "react";
import type { Lead, Order, OrderStatus } from "@/db/schema";
import { formatILS } from "@/lib/format";
import { sourceLabel, STATUS_LABEL, STATUS_TONE } from "@/lib/admin/status";
import { formatDateTime } from "@/lib/admin/time";
import { LEAD_STATUS_LABEL, LEAD_STATUS_TONE, leadStatus } from "@/lib/admin/lead-status";
import { LEAD_KIND_LABELS } from "@/lib/leads";

/** The admin's small building blocks (server components). */

export const ils = (n: number) => formatILS(n, "he");

export function StatusBadge({ status, className = "" }: { status: OrderStatus; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${STATUS_TONE[status]} ${className}`}>{STATUS_LABEL[status]}</span>;
}

export function LeadBadge({ status }: { status: string }) {
  const s = leadStatus(status);
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${LEAD_STATUS_TONE[s]}`}>{LEAD_STATUS_LABEL[s]}</span>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-ink-soft">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-extrabold tracking-normal">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A label and its value, in a definition list. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-0">
      <dt className="shrink-0 text-sm text-ink-soft">{label}</dt>
      <dd className="text-end text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl2 border border-dashed border-line bg-white/60 p-8 text-center text-ink-soft">{children}</div>;
}

/** An order in a list: who, how much, what state. The whole card opens it; `followUp` (a wa.me link) adds a WhatsApp button under it. */
export function OrderCard({ o, followUp, profile }: { o: Order; followUp?: string; /** the profile colour, in one word (the orders list) */ profile?: string }) {
  const card = (
    <Link href={`/admin/orders/${o.id}/`} className={`card flex items-center gap-3 p-4 transition hover:border-brand/40 hover:shadow-lift active:scale-[0.99] ${followUp ? "rounded-b-none" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold">{o.customerName}</span>
          {o.partial ? <span className="text-xs text-copper-deep">(פרטים חלקיים)</span> : null}
          {o.isTest ? <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-bold text-ink-soft">בדיקה</span> : null}
          {o.source ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800">{sourceLabel(o.source)}</span> : null}
        </div>
        {profile ? (
          <div className="mt-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${profile === "שחור" ? "bg-ink text-white ring-ink" : profile === "לבן" ? "bg-white text-ink ring-line" : "bg-sand text-ink-soft ring-sand"}`}>
              צבע פרופיל: {profile}
            </span>
          </div>
        ) : null}
        <div className="mt-0.5 truncate text-sm text-ink-soft">
          #{o.id} · <bdi>{formatDateTime(o.createdAt)}</bdi>
          {o.city ? ` · ${o.city}` : ""}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-[15px] font-extrabold" dir="ltr">
          {ils(o.total)}
        </span>
        <StatusBadge status={o.status} />
      </div>
    </Link>
  );
  if (!followUp) return <li>{card}</li>;
  return (
    <li>
      {card}
      <a href={followUp} target="_blank" rel="noopener" className="btn-wa min-h-11 w-full justify-center rounded-t-none text-sm">
        <span aria-hidden>💬</span> הודעת המשך בוואטסאפ
      </a>
    </li>
  );
}

/** Call, WhatsApp and email buttons for a customer. */
export function ContactButtons({ phone, email, name }: { phone: string; email?: string | null; name: string }) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  const hello = encodeURIComponent(`שלום ${name.split(" ")[0]}, כאן מודובוקס לגבי ההזמנה שלך`);
  return (
    <div className="grid grid-cols-3 gap-2">
      <a href={`tel:${digits}`} className="btn-ghost min-h-12 justify-center px-3 text-sm">
        <span aria-hidden>📞</span> חיוג
      </a>
      <a href={`https://wa.me/${intl}?text=${hello}`} target="_blank" rel="noopener" className="btn-wa min-h-12 justify-center px-3 text-sm">
        <span aria-hidden>💬</span> וואטסאפ
      </a>
      {email ? (
        <a href={`mailto:${email}`} className="btn-ghost min-h-12 justify-center px-3 text-sm">
          <span aria-hidden>✉️</span> מייל
        </a>
      ) : (
        <span className="btn-ghost min-h-12 justify-center px-3 text-sm opacity-40" aria-disabled>
          אין מייל
        </span>
      )}
    </div>
  );
}

/** Shown on every page while no database is connected. */
export function NoDatabase() {
  return (
    <Section title="מסד הנתונים עוד לא מחובר">
      <p className="leading-7 text-ink-soft">
        כדי שההזמנות יישמרו ויופיעו כאן, צריך לחבר מסד נתונים ב־Vercel: בפרויקט <b>modubox-site</b> → <b>Storage</b> → <b>Create Database</b> → <b>Neon</b>, ולחבר אותו לפרויקט. אחר כך פריסה מחדש (Redeploy). ההוראות המלאות ב־docs/admin-spec.md.
      </p>
      <p className="mt-2 text-sm text-ink-soft">עד אז ההזמנות נשמרות רק בלוגים של Vercel ובפאנל של Z-Credit.</p>
    </Section>
  );
}

/** A lead in the list: who, about what, which state. The whole card opens it. */
export function LeadCard({ l }: { l: Lead }) {
  return (
    <li>
      <Link href={`/admin/leads/${l.id}/`} className="card flex items-center gap-3 p-4 transition hover:border-brand/40 hover:shadow-lift active:scale-[0.99]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-bold">{l.name}</span>
            {l.locale === "en" ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800">EN</span> : null}
          </div>
          <div className="mt-0.5 truncate text-sm text-ink-soft">
            <bdi>{formatDateTime(l.createdAt)}</bdi> · {l.product || LEAD_KIND_LABELS[l.kind] || l.kind}
            {l.city ? ` · ${l.city}` : ""}
          </div>
          {l.notes ? <div className="mt-1 truncate text-sm text-copper-deep">📝 {l.notes}</div> : l.message ? <div className="mt-1 truncate text-sm text-ink-soft">{l.message}</div> : null}
        </div>
        <LeadBadge status={l.status} />
      </Link>
    </li>
  );
}
