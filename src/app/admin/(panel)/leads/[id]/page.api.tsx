import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import type { LeadEvent } from "@/db/schema";
import { ConfirmForm } from "@/components/admin/ContentForms";
import { LeadNoteForm, LeadStatusButtons } from "@/components/admin/LeadForms";
import { LeadBadge, NoDatabase, Row, Section } from "@/components/admin/ui";
import { getLead, LEAD_STATUS_LABEL, leadSource, leadStatus } from "@/lib/admin/leads";
import { can } from "@/lib/admin/auth";
import { deleteLeadAction } from "@/lib/admin/lead-actions";
import { requireAdmin } from "@/lib/admin/session";
import { formatDateTime } from "@/lib/admin/time";
import { LEAD_KIND_LABELS } from "@/lib/leads";
import { waNumber } from "@/lib/admin/follow-up";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `ליד ${(await params).id}` };
}

function eventText(e: LeadEvent): string {
  if (e.kind === "status") return `סטטוס: ${e.fromStatus ? LEAD_STATUS_LABEL[leadStatus(e.fromStatus)] : ""} ← ${e.toStatus ? LEAD_STATUS_LABEL[leadStatus(e.toStatus)] : ""}`;
  return e.text ?? "";
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin("leads");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const full = await getLead(db, Number((await params).id));
  if (!full) notFound();
  const { lead: l, events } = full;
  const a = l.attribution ?? {};
  const first = l.name.split(" ")[0];
  const about = l.product ? ` על ${l.product}` : "";
  const hello = encodeURIComponent(`שלום ${first}, כאן מודובוקס, לגבי הפנייה שלך באתר${about}`);
  const digits = l.phone.replace(/[^\d+]/g, "");
  const subject = encodeURIComponent(`מודובוקס: הפנייה שלך${about}`);
  const history = [{ id: 0, at: l.createdAt, icon: "📥", text: `הליד התקבל (${LEAD_KIND_LABELS[l.kind] ?? l.kind})${l.emailedAt ? " ונשלח במייל" : ""}`, actor: "system" }, ...events.map((e) => ({ id: e.id, at: e.at, icon: e.kind === "note" ? "📝" : "🔄", text: eventText(e), actor: e.actor, note: e.kind === "note" }))];

  return (
    <div className="space-y-4">
      <Link href="/admin/leads/" className="inline-block text-sm font-semibold text-brand-dark">
        → כל הלידים
      </Link>

      <div className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{l.name}</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              ליד #{l.id} · <bdi>{formatDateTime(l.createdAt)}</bdi> · {LEAD_KIND_LABELS[l.kind] ?? l.kind}
            </p>
          </div>
          <LeadBadge status={l.status} />
        </div>
        {l.message ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-sand p-3 text-[15px] leading-7">{l.message}</p> : null}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <a href={`tel:${digits}`} className="btn-ghost min-h-12 justify-center px-3 text-sm">
            <span aria-hidden>📞</span> חיוג
          </a>
          <a href={`https://wa.me/${waNumber(l.phone)}?text=${hello}`} target="_blank" rel="noopener" className="btn-wa min-h-12 justify-center px-3 text-sm">
            <span aria-hidden>💬</span> וואטסאפ
          </a>
          {l.email ? (
            <a href={`mailto:${l.email}?subject=${subject}`} className="btn-ghost min-h-12 justify-center px-3 text-sm">
              <span aria-hidden>✉️</span> מייל
            </a>
          ) : (
            <span className="btn-ghost min-h-12 justify-center px-3 text-sm opacity-40" aria-disabled>
              אין מייל
            </span>
          )}
        </div>
      </div>

      <Section title="סטטוס">
        <LeadStatusButtons id={l.id} status={leadStatus(l.status)} />
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="פרטים">
          <dl>
            <Row label="טלפון">
              <a href={`tel:${digits}`} dir="ltr">
                {l.phone}
              </a>
            </Row>
            <Row label="מייל">{l.email ? <span dir="ltr">{l.email}</span> : null}</Row>
            <Row label="עיר">{l.city}</Row>
            <Row label="מוצר">{l.product}</Row>
            <Row label="הזמנה">{l.orderId ? <span dir="ltr">#{l.orderId}</span> : null}</Row>
            <Row label="נשלח מהדף">{l.page ? <span dir="ltr">{l.page}</span> : null}</Row>
            <Row label="שפת האתר">{l.locale === "en" ? "אנגלית" : "עברית"}</Row>
            <Row label="מייל לעסק">{l.emailedAt ? <bdi>{formatDateTime(l.emailedAt)}</bdi> : "לא נשלח"}</Row>
          </dl>
        </Section>

        <Section title="מקור (UTM)">
          {leadSource(l) || a.landing || a.referrer ? (
            <dl>
              <Row label="מקור">{a.utm_source ? <span dir="ltr">{a.utm_source}</span> : null}</Row>
              <Row label="מדיום">{a.utm_medium ? <span dir="ltr">{a.utm_medium}</span> : null}</Row>
              <Row label="קמפיין">{a.utm_campaign ? <span dir="ltr">{a.utm_campaign}</span> : null}</Row>
              <Row label="מילת מפתח">{a.utm_term ? <span dir="ltr">{a.utm_term}</span> : null}</Row>
              <Row label="תוכן">{a.utm_content ? <span dir="ltr">{a.utm_content}</span> : null}</Row>
              <Row label="פרסום">{[a.gclid && "Google Ads", a.fbclid && "Meta"].filter(Boolean).join(" · ")}</Row>
              <Row label="דף נחיתה">{a.landing ? <span dir="ltr" className="break-all">{a.landing}</span> : null}</Row>
              <Row label="הגיע מאתר">{a.referrer ? <span dir="ltr" className="break-all">{a.referrer}</span> : null}</Row>
            </dl>
          ) : (
            <p className="text-sm text-ink-soft">אין נתוני מקור (כניסה ישירה, או בלי UTM).</p>
          )}
        </Section>
      </div>

      <Section title="הערות והיסטוריה">
        <LeadNoteForm id={l.id} />
        <ol className="mt-4 space-y-3 border-s-2 border-line ps-4">
          {[...history].reverse().map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -start-[1.6rem] top-0 grid size-6 place-items-center rounded-full bg-white text-xs ring-2 ring-line" aria-hidden>
                {e.icon}
              </span>
              <div className={`whitespace-pre-wrap text-[15px] ${"note" in e && e.note ? "rounded-lg bg-copper-tint/60 px-3 py-2" : ""}`}>{e.text}</div>
              <div className="mt-0.5 text-xs text-ink-soft">
                <bdi>{formatDateTime(e.at)}</bdi>
                {e.actor !== "system" ? ` · ${e.actor === "admin" ? "ניהול" : e.actor === "sales" ? "מכירות" : e.actor}` : ""}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {can(session, "delete_leads") ? (
        <ConfirmForm action={deleteLeadAction} confirm={`למחוק את הליד #${l.id} של ${l.name}?`} className="pt-2 text-center">
          <input type="hidden" name="id" value={l.id} />
          <button type="submit" className="min-h-11 rounded-full px-5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">
            🗑 מחיקת הליד
          </button>
          <p className="mt-1 text-xs text-ink-soft">הליד יוסתר מהרשימה, מהספירות ומהנתונים.</p>
        </ConfirmForm>
      ) : null}
    </div>
  );
}
