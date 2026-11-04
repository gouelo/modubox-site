"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import faqFile from "../../../data/faq.json";
import type { FaqPatch, PromoData } from "../catalog-overrides";
import type { ActionState } from "./actions";
import { triggerDeploy } from "./catalog";
import { requireAdmin } from "./session";
import { cleanFaqRows, cleanReviews, faqForm, fileReviews, fileSiteTexts, promoError, resetText, saveText, siteDiff, siteError, SITE_EN_FIELDS, stableJson, type TextKind } from "./site-texts";

/** The site's texts and reviews (owner only). Saving keeps the change; it shows on the site with the next build ("פרסום לאתר"). */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const SAVED = "נשמר. כדי שיופיע באתר: “פרסום לאתר” למעלה.";

async function guarded(fn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<ActionState>): Promise<ActionState> {
  await requireAdmin("site");
  const db = getDb();
  if (!db) return { error: "מסד הנתונים לא מחובר, אז אי אפשר לשמור." };
  try {
    const r = await fn(db);
    revalidatePath("/admin/site", "layout");
    return r;
  } catch (e) {
    console.error("[site] save failed:", e);
    return { error: "השמירה נכשלה. נסו שוב בעוד רגע." };
  }
}

export async function saveSiteTextsAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const base = fileSiteTexts();
    const wanted = {
      ...base,
      phone: str(form, "phone"),
      phoneAlt: str(form, "phoneAlt"),
      whatsapp: str(form, "whatsapp").replace(/\D/g, "").replace(/^0/, "972"),
      whatsappGreeting: str(form, "whatsappGreeting"),
      email: str(form, "email"),
      factory: str(form, "factory"),
      factory2: str(form, "factory2"),
      pickupLocation: str(form, "pickupLocation"),
      hours: str(form, "hours"),
      rating: Number(str(form, "rating")),
      reviewCount: Number(str(form, "reviewCount")),
      floatingConfiguratorCta: form.get("floatingConfiguratorCta") === "on",
      en: Object.fromEntries(SITE_EN_FIELDS.map((k) => [k, str(form, `en_${k}`)])) as typeof base.en,
    };
    const error = siteError(wanted);
    if (error) return { error };
    const diff = siteDiff(wanted);
    if (Object.keys(diff).length) await saveText(db, "site", diff);
    else await resetText(db, "site");
    return { ok: true, message: SAVED };
  });
}

export async function savePromoAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const p: PromoData = {
      enabled: form.get("enabled") === "on",
      eyebrow: str(form, "eyebrow"),
      title: str(form, "title"),
      text: str(form, "text"),
      endDate: str(form, "endDate"),
      cta: { label: str(form, "ctaLabel"), href: str(form, "ctaHref") || "whatsapp", whatsappText: str(form, "whatsappText") },
      en: { enabled: form.get("en_enabled") === "on", eyebrow: str(form, "en_eyebrow"), title: str(form, "en_title"), text: str(form, "en_text"), ctaLabel: str(form, "en_ctaLabel"), whatsappText: str(form, "en_whatsappText") },
    };
    const error = promoError(p);
    if (error) return { error };
    await saveText(db, "promo", p);
    return { ok: true, message: SAVED };
  });
}

export async function saveFaqAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const files = faqForm(undefined);
    const patch: FaqPatch = { groups: {} };
    for (const g of faqFile.groups) {
      if (!form.has(`rows_${g.id}`)) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(str(form, `rows_${g.id}`));
      } catch {
        return { error: "הנתונים לא נקראו. רעננו את הדף ונסו שוב." };
      }
      const rows = cleanFaqRows(parsed, g.items.length);
      if (!rows) return { error: `בקבוצה “${g.title}” יש שאלה בלי תשובה (או בלי שאלה).` };
      const file = files.find((f) => f.id === g.id)!;
      const title = str(form, `title_${g.id}`) || file.title;
      const enTitle = str(form, `enTitle_${g.id}`) || file.enTitle;
      // a group as in the files is not saved: the files stay its source
      if (stableJson(rows) === stableJson(file.rows) && title === file.title && enTitle === file.enTitle) continue;
      patch.groups[g.id] = { items: rows, ...(title !== file.title ? { title } : {}), ...(enTitle !== file.enTitle ? { enTitle } : {}) };
    }
    if (Object.keys(patch.groups).length) await saveText(db, "faq", patch);
    else await resetText(db, "faq");
    return { ok: true, message: SAVED };
  });
}

export async function saveReviewsAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    let raw: unknown;
    try {
      raw = JSON.parse(str(form, "rows"));
    } catch {
      return { error: "הנתונים לא נקראו. רעננו את הדף ונסו שוב." };
    }
    const rows = cleanReviews(raw);
    if (!rows) return { error: "לכל ביקורת צריך שם, טקסט, תאריך ודירוג 1–5." };
    if (stableJson(rows) === stableJson(fileReviews())) await resetText(db, "reviews");
    else await saveText(db, "reviews", { reviews: rows });
    return { ok: true, message: SAVED };
  });
}

export async function resetTextAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const kind = str(form, "kind") as TextKind;
    if (!["site", "promo", "faq", "reviews"].includes(kind)) return { error: "לא נמצא." };
    await resetText(db, kind);
    return { ok: true, message: "חזר למה שבקבצים. יופיע באתר בפרסום הבא." };
  });
}

export async function publishSiteAction(_: ActionState): Promise<ActionState> {
  await requireAdmin("site");
  const deploy = await triggerDeploy();
  revalidatePath("/admin/site", "layout");
  if (deploy === "started") return { ok: true, message: "האתר נבנה עכשיו עם השינויים: בעוד 2–3 דקות הם באוויר." };
  if (deploy === "no_hook") return { ok: true, message: "השינויים יעלו לאתר בפריסה הבאה. כדי שזה יקרה מיד בלחיצה: צריך להגדיר Deploy Hook ב־Vercel (VERCEL_DEPLOY_HOOK_URL)." };
  return { error: "הפעלת הבנייה ב־Vercel נכשלה. נסו שוב, או Redeploy ב־Vercel." };
}
