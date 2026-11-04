import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import type { OrderEvent } from "@/db/schema";
import { NextStepButton, NoteForm, ScheduleForm, StatusSelect } from "@/components/admin/OrderForms";
import { ContactButtons, ils, NoDatabase, Row, Section, StatusBadge } from "@/components/admin/ui";
import { allowedMoves, NEXT_STEP, STATUS_LABEL } from "@/lib/admin/status";
import { formatDateTime, formatDay } from "@/lib/admin/time";
import { getOrder, paymentMethodLabel } from "@/lib/orders";
import { followUpLink } from "@/lib/admin/follow-up";
import { requestOrigin } from "@/lib/admin/origin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `הזמנה ${(await params).id}` };
}

function eventText(e: OrderEvent): string {
  if (e.kind === "status") return `סטטוס: ${e.fromStatus ? STATUS_LABEL[e.fromStatus] : ""} ← ${e.toStatus ? STATUS_LABEL[e.toStatus] : ""}`;
  if (e.kind === "schedule" && e.toStatus) return `${e.text} · הסטטוס עבר ל"${STATUS_LABEL[e.toStatus]}"`;
  return e.text ?? "";
}

const EVENT_ICON: Record<string, string> = { created: "🛒", paid: "💳", status: "🔄", schedule: "📅", note: "📝", email: "✉️" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const { id } = await params;
  const full = await getOrder(db, decodeURIComponent(id));
  if (!full) notFound();
  const { order: o, items, events } = full;
  const paid = !!o.paidAt;
  const next = NEXT_STEP[o.status];
  const moves = allowedMoves(o.status, paid).filter((s) => s !== next?.to);
  const canSchedule = paid && o.status !== "cancelled" && o.status !== "refunded";
  const followUp = o.status === "pending_payment" && !o.isTest && items[0] ? followUpLink(o, { slug: items[0].productSlug, name: items[0].productName, more: items.length - 1 }, await requestOrigin()) : null;

  return (
    <div className="space-y-4">
      <Link href="/admin/orders/" className="inline-block text-sm font-semibold text-brand-dark">
        → כל ההזמנות
      </Link>

      <div className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{o.customerName}</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              הזמנה #{o.id} · <bdi>{formatDateTime(o.createdAt)}</bdi>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-2xl font-extrabold" dir="ltr">
              {ils(o.total)}
            </span>
            <StatusBadge status={o.status} />
          </div>
        </div>
        {o.status === "pending_payment" ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-ink-soft">הלקוח עבר לדף התשלום ועוד לא שילם. כשהתשלום יאושר ב־Z-Credit, ההזמנה תעבור לבד ל"חדשה".</p> : null}
        {followUp ? (
          <a href={followUp} target="_blank" rel="noopener" className="btn-wa mt-2 min-h-11 w-full justify-center text-sm">
            <span aria-hidden>💬</span> הודעת המשך בוואטסאפ (נפתחת לעריכה, לא נשלחת לבד)
          </a>
        ) : null}
        {o.isTest ? <p className="mt-3 rounded-lg bg-sand p-3 text-sm text-ink-soft">הזמנת בדיקה (מוצר הבדיקה ב־1 ₪): לא נספרת במכירות.</p> : null}
        {o.partial ? <p className="mt-3 rounded-lg bg-copper-tint p-3 text-sm text-copper-deep">ההזמנה נשמרה מפרטי התשלום בלבד, בלי פרטי המוצרים. את הפרטים אפשר לראות בפאנל של Z-Credit.</p> : null}
        <div className="mt-4 space-y-2">
          {next ? next.to === "scheduled" ? (
            <a href="#schedule" className="btn-brand min-h-12 w-full justify-center text-base">
              {next.label} ←
            </a>
          ) : (
            <NextStepButton id={o.id} to={next.to} label={next.label} />
          ) : null}
          <ContactButtons phone={o.customerPhone} email={o.customerEmail} name={o.customerName} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="לקוח">
          <dl>
            <Row label="שם">
              <Link href={`/admin/customers/${o.customerKey}/`} className="text-brand-dark underline-offset-4 hover:underline">
                {o.customerName}
              </Link>
            </Row>
            <Row label="טלפון">
              <a href={`tel:${o.customerPhone.replace(/[^\d+]/g, "")}`} dir="ltr">
                {o.customerPhone}
              </a>
            </Row>
            <Row label="מייל">{o.customerEmail}</Row>
            <Row label="כתובת">{[o.address, o.city].filter(Boolean).join(", ")}</Row>
            <Row label="הערות הלקוח">{o.customerNotes}</Row>
            <Row label="שפת האתר">{o.locale === "en" ? "אנגלית" : null}</Row>
            <Row label="מסכים/ה לדיוור">{o.marketingConsent === null ? null : o.marketingConsent ? "כן, סימן/ה בקופה" : "לא"}</Row>
          </dl>
        </Section>

        <Section title="תשלום">
          <dl>
            <Row label="מוצרים ותוספות">{ils(o.itemsTotal)}</Row>
            <Row label="אספקה והתקנה">{o.fulfillmentTotal ? ils(o.fulfillmentTotal) : "—"}</Row>
            <Row label="קופון">{o.couponCode ? `${o.couponCode} (−${ils(o.discount)})` : null}</Row>
            <Row label="שולם">{paid ? <>{ils(o.total)} · <bdi>{formatDateTime(o.paidAt)}</bdi></> : "עוד לא"}</Row>
            <Row label="תשלומים">{(o.paidInstallments ?? o.installments) > 1 ? `${o.paidInstallments ?? o.installments} תשלומים` : "תשלום אחד"}</Row>
            <Row label="למתקין ביום ההתקנה">{o.payLater ? ils(o.payLater) : null}</Row>
            <Row label="אמצעי תשלום">{[paymentMethodLabel(o.paymentMethod), o.card].filter(Boolean).join(" · ")}</Row>
            <Row label="אסמכתא Z-Credit">{o.zcreditReference ? <span dir="ltr">{o.zcreditReference}</span> : null}</Row>
            <Row label="מספר אישור">{o.approvalNumber ? <span dir="ltr">{o.approvalNumber}</span> : null}</Row>
          </dl>
        </Section>
      </div>

      <Section title={items.length === 1 ? "מה הוזמן" : `מה הוזמן (${items.length} פריטים)`}>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">
                    {i.productName}
                    {i.qty > 1 ? ` ×${i.qty}` : ""}
                  </span>
                  <span className="shrink-0 font-bold">{ils(i.itemsTotal)}</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                  <li>מחיר בסיס: {ils(i.basePrice)}</li>
                  {i.addons.map((a, n) => (
                    <li key={n}>
                      + {a.label}
                      {a.qty > 1 ? ` ×${a.qty}` : ""}: {a.total === null ? <span className="text-copper-deep">מחיר בתיאום</span> : ils(a.total)}
                    </li>
                  ))}
                  <li>
                    🚚 {i.fulfillmentLabel}
                    {i.fulfillmentPrice ? `: ${ils(i.fulfillmentTotal)}` : ""}
                    {i.payToInstaller ? " (משולם למתקין)" : ""}
                  </li>
                  {i.designLink ? (
                    <li>
                      <a href={i.designLink} target="_blank" rel="noopener" className="font-semibold text-brand-dark underline underline-offset-4">
                        העיצוב בקונפיגורטור התלת־ממדי ↗
                      </a>
                    </li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">אין פרטי מוצרים להזמנה הזו.</p>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="אספקה והתקנה">
          <div id="schedule" className="scroll-mt-20">
            {o.scheduledFor ? (
              <p className="mb-3 rounded-lg bg-brand-tint p-3 font-bold text-brand-dark">
                📅 {formatDay(o.scheduledFor)}
                {o.scheduleNote ? <> · <bdi>{o.scheduleNote}</bdi></> : null}
              </p>
            ) : null}
            {canSchedule ? <ScheduleForm id={o.id} date={o.scheduledFor} note={o.scheduleNote} /> : <p className="text-sm text-ink-soft">אפשר לקבוע מועד רק להזמנה ששולמה ולא בוטלה.</p>}
          </div>
        </Section>

        <Section title="שינוי סטטוס">
          <StatusSelect id={o.id} moves={moves} />
          {paid && (o.status === "cancelled" || o.status === "refunded") ? <p className="mt-2 text-sm text-ink-soft">את הזיכוי עצמו (החזר הכסף) עושים בפאנל של Z-Credit. כאן רק מסמנים אותו.</p> : null}
        </Section>
      </div>

      <Section title="הערות והיסטוריה">
        <NoteForm id={o.id} />
        <ol className="mt-4 space-y-3 border-s-2 border-line ps-4">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -start-[1.6rem] top-0 grid size-6 place-items-center rounded-full bg-white text-xs ring-2 ring-line" aria-hidden>
                {EVENT_ICON[e.kind] ?? "•"}
              </span>
              <div className={`text-[15px] ${e.kind === "note" ? "rounded-lg bg-copper-tint/60 px-3 py-2" : ""}`}>{eventText(e)}</div>
              <div className="mt-0.5 text-xs text-ink-soft">
                <bdi>{formatDateTime(e.at)}</bdi>
                {e.actor !== "system" ? ` · ${e.actor === "admin" ? "ניהול" : e.actor}` : ""}
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
