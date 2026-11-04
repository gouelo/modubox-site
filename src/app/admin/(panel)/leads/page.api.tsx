import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { Empty, NoDatabase, PageTitle } from "@/components/admin/ui";
import { LEAD_KIND_LABELS, listLeads } from "@/lib/leads";
import { requireAdmin } from "@/lib/admin/session";
import { formatDateTime } from "@/lib/admin/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "לידים" };

/** Leads from the site's forms, newest first (read-only). */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("customers");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);
  const list = await listLeads(db, q);
  return (
    <>
      <PageTitle title="לידים" sub="פניות מהטפסים באתר, החדשות למעלה" />
      <form method="get" className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          חיפוש ליד
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="שם, טלפון, מייל, עיר או מוצר" className="field min-h-12 flex-1" />
        <button type="submit" className="btn-primary min-h-12 px-5">
          חיפוש
        </button>
      </form>
      {list.length ? (
        <ul className="space-y-3">
          {list.map((l) => {
            const a = l.attribution;
            const source = [a.utm_source && `${a.utm_source}${a.utm_medium ? ` / ${a.utm_medium}` : ""}`, a.utm_campaign, a.gclid && "Google Ads", a.fbclid && "Meta", a.referrer].filter(Boolean).join(" · ");
            return (
              <li key={l.id} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-bold">{l.name}</span>
                  <span className="text-sm text-ink-soft">
                    <bdi>{formatDateTime(l.createdAt)}</bdi> · {LEAD_KIND_LABELS[l.kind] ?? l.kind}
                    {l.locale === "en" ? " · אנגלית" : ""}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">
                  <span dir="ltr">{l.phone}</span>
                  {l.email ? <> · <span dir="ltr">{l.email}</span></> : null}
                  {l.city ? ` · ${l.city}` : ""}
                </p>
                {(l.product || l.orderId) && (
                  <p className="mt-1 text-sm">
                    {l.product}
                    {l.orderId ? (
                      <>
                        {l.product ? " · " : ""}הזמנה <span dir="ltr">#{l.orderId}</span>
                      </>
                    ) : null}
                  </p>
                )}
                {l.message && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-sand p-3 text-[15px]">{l.message}</p>}
                <p className="mt-2 text-xs text-ink-soft">
                  {l.page ? <>נשלח מ־<span dir="ltr">{l.page}</span></> : null}
                  {source ? ` · מקור: ${source}` : ""}
                  {l.emailedAt ? " · נשלח במייל" : " · לא נשלח במייל"}
                </p>
                <LeadButtons phone={l.phone} email={l.email} name={l.name} />
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>{q ? "לא נמצאו לידים." : "עוד אין לידים."}</Empty>
      )}
      <p className="mt-6 text-center text-xs text-ink-soft">
        <Link href="/admin/customers/" className="underline">
          ללקוחות שהזמינו
        </Link>
      </p>
    </>
  );
}

function LeadButtons({ phone, email, name }: { phone: string; email: string | null; name: string }) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  const hello = encodeURIComponent(`שלום ${name.split(" ")[0]}, כאן מודובוקס, לגבי הפנייה שלך באתר`);
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={`tel:${digits}`} className="btn-ghost min-h-11 px-4 text-sm">
        <span aria-hidden>📞</span> חיוג
      </a>
      <a href={`https://wa.me/${intl}?text=${hello}`} target="_blank" rel="noopener" className="btn-wa min-h-11 px-4 text-sm">
        <span aria-hidden>💬</span> וואטסאפ
      </a>
      {email && (
        <a href={`mailto:${email}`} className="btn-ghost min-h-11 px-4 text-sm">
          <span aria-hidden>✉️</span> מייל
        </a>
      )}
    </div>
  );
}
