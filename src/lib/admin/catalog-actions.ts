"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { AddonPatch, ProductPatch } from "../catalog-overrides";
import type { ActionState } from "./actions";
import { copyProduct, discardAddonDraft, discardProductDraft, fileAddons, publishDrafts, saveAddonDraft, saveProductDraft, triggerDeploy } from "./catalog";
import { requireAdmin } from "./session";

/** The catalog's server actions (owner only). Saving keeps a draft; publishing builds the site with the drafts. */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
/** "" → null (not offered / on request); otherwise a number (NaN fails validation) */
const money = (f: FormData, k: string): number | null => (str(f, k) === "" ? null : Number(str(f, k).replace(/[,\s₪]/g, "")));

async function guarded(fn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<ActionState>): Promise<ActionState> {
  await requireAdmin("catalog");
  const db = getDb();
  if (!db) return { error: "מסד הנתונים לא מחובר, אז אי אפשר לשמור." };
  try {
    return await fn(db);
  } catch (e) {
    console.error("[catalog] save failed:", e);
    return { error: "השמירה נכשלה. נסו שוב בעוד רגע." };
  }
}

const done = () => {
  revalidatePath("/admin/catalog", "layout");
  return { ok: true, message: "נשמר כטיוטה. כדי שיופיע באתר: “פרסום לאתר” למעלה." };
};

export async function saveProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const slug = str(form, "slug");
    let images: string[] = [];
    try {
      images = (JSON.parse(str(form, "images") || "[]") as string[]).map((s) => s.trim()).filter(Boolean);
    } catch {}
    const addonIds = fileAddons().map((a) => a.id);
    const overrides: Record<string, number> = {};
    for (const id of addonIds) {
      const v = money(form, `addonPrice_${id}`);
      if (v !== null && form.get(`addon_${id}`) === "on") overrides[id] = v;
    }
    const wanted: ProductPatch = {
      name: str(form, "name"),
      price: Number(str(form, "price").replace(/[,\s₪]/g, "")),
      badge: str(form, "badge") || null,
      shortDescription: str(form, "shortDescription"),
      warrantyYears: Number(str(form, "warrantyYears")),
      configurable: form.get("configurable") === "on",
      images,
      addons: addonIds.filter((id) => form.get(`addon_${id}`) === "on"),
      addonPriceOverrides: overrides,
      fulfillment: {
        pickup: money(form, "f_pickup"),
        delivery: money(form, "f_delivery"),
        installation: money(form, "f_installation"),
        deliveryAndInstallation: money(form, "f_deliveryAndInstallation"),
        payToInstaller: form.get("payToInstaller") === "on",
        note: str(form, "note") || null,
      },
      en: { name: str(form, "en_name"), shortDescription: str(form, "en_shortDescription"), badge: str(form, "en_badge") },
      hidden: form.get("hidden") === "on",
    };
    if (form.has("sizeLabel")) {
      wanted.sizeLabel = str(form, "sizeLabel");
      wanted.widthM = Number(str(form, "widthM"));
      wanted.depthM = Number(str(form, "depthM"));
      wanted.areaM2 = Number(str(form, "areaM2"));
      if (![wanted.widthM, wanted.depthM, wanted.areaM2].every((n) => n > 0 && n < 100)) return { error: "מידות לא תקינות." };
    }
    // the order of the add-ons stays the product's own
    const r = await saveProductDraft(db, slug, wanted);
    return r.ok ? done() : { error: r.error };
  });
}

export async function copyProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  let slug = "";
  const state = await guarded(async (db) => {
    slug = str(form, "slug").toLowerCase();
    const r = await copyProduct(db, str(form, "from"), slug, str(form, "name"));
    return r.ok ? done() : { error: r.error };
  });
  if (state.ok) redirect(`/admin/catalog/product/?slug=${slug}`);
  return state;
}

export async function saveAddonAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const id = str(form, "id");
    const base = fileAddons().find((a) => a.id === id);
    if (!base) return { error: "התוספת לא נמצאה." };
    const wanted: AddonPatch = { name: str(form, "name"), description: str(form, "description"), en: { name: str(form, "en_name"), description: str(form, "en_description") } };
    if (base.kind !== "choice") wanted.price = money(form, "price");
    if (base.pricePerM2 !== undefined) wanted.pricePerM2 = Number(str(form, "pricePerM2"));
    if (base.maxQty !== undefined) wanted.maxQty = Number(str(form, "maxQty"));
    if (base.choices) wanted.choices = Object.fromEntries(base.choices.map((c) => [c.id, { label: str(form, `choiceLabel_${c.id}`), ...(base.pricePerM2 ? {} : { price: money(form, `choicePrice_${c.id}`) }) }]));
    const r = await saveAddonDraft(db, id, wanted);
    return r.ok ? done() : { error: r.error };
  });
}

export async function discardProductAction(form: FormData): Promise<void> {
  await guarded(async (db) => {
    await discardProductDraft(db, str(form, "slug"));
    return done();
  });
  redirect(`/admin/catalog/product/?slug=${encodeURIComponent(str(form, "slug"))}`);
}

export async function discardAddonAction(form: FormData): Promise<void> {
  await guarded(async (db) => {
    await discardAddonDraft(db, str(form, "id"));
    return done();
  });
  redirect(`/admin/catalog/addon/?id=${encodeURIComponent(str(form, "id"))}`);
}

export async function publishAction(_: ActionState): Promise<ActionState> {
  return guarded(async (db) => {
    const n = await publishDrafts(db);
    const deploy = await triggerDeploy();
    revalidatePath("/admin/catalog", "layout");
    const what = n ? `פורסמו ${n} שינויים. ` : "";
    if (deploy === "started") return { ok: true, message: `${what}האתר נבנה עכשיו עם השינויים: בעוד 2–3 דקות הם באוויר.` };
    if (deploy === "no_hook") return { ok: true, message: `${what}הם יעלו לאתר בפריסה הבאה. כדי שזה יקרה מיד בלחיצה: צריך להגדיר Deploy Hook ב־Vercel (VERCEL_DEPLOY_HOOK_URL).` };
    return { error: `${what}השינויים נשמרו לפרסום, אבל הפעלת הבנייה ב־Vercel נכשלה. נסו שוב, או Redeploy ב־Vercel.` };
  });
}
