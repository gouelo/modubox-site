import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import type { OrderEvent } from "@/db/schema";
import { NoteForm, StatusSelect } from "@/components/admin/OrderForms";
import { ContactButtons, ils, NoDatabase, Row, Section, StatusBadge } from "@/components/admin/ui";
import { allowedMoves, CANCELLED, STATUS_NAME } from "@/lib/admin/status";
import { formatDateTime } from "@/lib/admin/time";
import { committed, getOrder, paymentMethodLabel } from "@/lib/orders";
import { ConfirmForm } from "@/components/admin/ContentForms";
import { CopyButton } from "@/components/admin/CopyButton";
import { markPaidAction } from "@/lib/admin/manual-order-actions";
import { deleteOrdersAction } from "@/lib/admin/actions";
import { can } from "@/lib/admin/auth";
import { MANUAL_PAYMENTS, PAYMENT_LABEL, paymentLabel } from "@/lib/admin/manual-order";
import { sourceLabel } from "@/lib/admin/status";
import { waNumber } from "@/lib/admin/follow-up";
import { followUpLink } from "@/lib/admin/follow-up";
import { requestOrigin } from "@/lib/admin/origin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `הזמנה ${(await params).id}` };
}

function eventText(e: OrderEvent): string {
  // the history keeps older orders' statuses by their own names
  if (e.kind === "status") return `סטטוס: ${e.fromStatus ? STATUS_NAME[e.fromStatus] : ""} ← ${e.toStatus ? STATUS_NAME[e.toStatus] : ""}`;
  if (e.kind === "schedule" && e.toStatus) return `${e.text} · הסטטוס עבר ל"${STATUS_NAME[e.toStatus]}"`;
  return e.text ?? "";
}

const EVENT_ICON: Record<string, string> = { created: "🛒", paid: "💳", status: "🔄", schedule: "📅", note: "📝", email: "✉️" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const session = await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const { id } = await params;
  const { created } = await searchParams;
  const full = await getOrder(db, decodeURIComponent(id));
  if (!full) notFound();
  const { order: o, items, events } = full;
  const paid = !!o.paidAt;
  const moves = allowedMoves(o.status, committed(o));
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
        {created ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">✓ ההזמנה נשמרה.</p> : null}
        {o.source ? (
          <p className="mt-3 text-sm text-ink-soft">
            הזמנה ידנית ({sourceLabel(o.source)}) · {paymentLabel(o.payment)} · {paid ? "שולם" : "עוד לא שולם"}
          </p>
        ) : null}
        {o.paymentLink && !paid ? (
          <div className="mt-3 rounded-lg bg-sky-50 p-3">
            <p className="text-sm font-bold">קישור התשלום ללקוח</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`https://wa.me/${waNumber(o.customerPhone)}?text=${encodeURIComponent(`שלום ${o.customerName.split(" ")[0]}, כאן מודובוקס. מצרפים קישור לתשלום מאובטח על ההזמנה (${ils(o.total)}):\n${o.paymentLink}`)}`} target="_blank" rel="noopener" className="btn-wa min-h-11 px-4 text-sm">
                <span aria-hidden>💬</span> שליחה בוואטסאפ
              </a>
              <CopyButton text={o.paymentLink} label="העתקת הקישור" />
            </div>
            <p className="mt-2 text-xs text-ink-soft">כשהלקוח ישלם, ההזמנה תסומן כשולמה לבד (כמו בקופה באתר).</p>
          </div>
        ) : null}
        {o.source && !paid && !o.paymentLink && !CANCELLED.includes(o.status) ? (
          <ConfirmForm action={markPaidAction} confirm="לסמן שההזמנה שולמה?" className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={o.id} />
            <label className="text-sm">
              <span className="mb-1 block font-semibold">שולם ב־</span>
              <select name="payment" defaultValue={o.payment ?? "transfer"} className="field min-h-11">
                {MANUAL_PAYMENTS.filter((p) => p !== "zcredit_link").map((p) => (
                  <option key={p} value={p}>
                    {PAYMENT_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary min-h-11 px-4 text-sm">
              סימון כשולם
            </button>
          </ConfirmForm>
        ) : null}
        {o.isTest ? <p className="mt-3 rounded-lg bg-sand p-3 text-sm text-ink-soft">הזמנת בדיקה (מוצר הבדיקה ב־1 ₪): לא נספרת במכירות.</p> : null}
        {o.partial ? <p className="mt-3 rounded-lg bg-copper-tint p-3 text-sm text-copper-deep">ההזמנה נשמרה מפרטי התשלום בלבד, בלי פרטי המוצרים. את הפרטים אפשר לראות בפאנל של Z-Credit.</p> : null}
        <div className="mt-4 space-y-2">
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
            <Row label="אמצעי תשלום">{[paymentMethodLabel(o.paymentMethod), o.card, o.paymentMethod === null ? paymentLabel(o.payment) : ""].filter(Boolean).join(" · ")}</Row>
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

      <Section title="שינוי סטטוס">
        <StatusSelect id={o.id} moves={moves} />
        {paid && CANCELLED.includes(o.status) ? <p className="mt-2 text-sm text-ink-soft">את הזיכוי עצמו (החזר הכסף) עושים בפאנל של Z-Credit. כאן רק מסמנים אותו.</p> : null}
      </Section>

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

      {can(session, "delete_orders") ? (
        <ConfirmForm action={deleteOrdersAction} confirm={`למחוק את ההזמנה #${o.id} של ${o.customerName}? לא ניתן לשחזר.`} className="pt-2 text-center">
          <input type="hidden" name="id" value={o.id} />
          <button type="submit" className="min-h-11 rounded-full px-5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">
            🗑 מחיקת ההזמנה
          </button>
          <p className="mt-1 text-xs text-ink-soft">מוחק את ההזמנה, הפריטים וההיסטוריה שלה לצמיתות{paid ? ". את הכסף עצמו (אם צריך) מחזירים בפאנל של Z-Credit" : ""}.</p>
        </ConfirmForm>
      ) : null}
    </div>
  );
}
