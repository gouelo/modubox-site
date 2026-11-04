"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { ActionState } from "./actions";
import { deleteCoupon, importEnvCoupons, saveCoupon } from "./coupons";
import { requireAdmin } from "./session";

/** The coupons' server actions (owner only). A change works at checkout at once: coupons are read on the server. */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string): number | null => (str(f, k) === "" ? null : Number(str(f, k).replace(/[,\s₪%]/g, "")));

export async function saveCouponAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin("coupons");
  const db = getDb();
  if (!db) return { error: "מסד הנתונים לא מחובר, אז אי אפשר לשמור." };
  let r;
  try {
    r = await saveCoupon(
      db,
      {
        code: str(form, "code"),
        kind: str(form, "kind") === "fixed" ? "fixed" : "percent",
        value: num(form, "value") ?? NaN,
        minTotal: num(form, "minTotal"),
        until: str(form, "until") || null,
        delivery: form.get("delivery") === "on",
        maxUses: num(form, "maxUses"),
        enabled: form.get("enabled") === "on",
        note: str(form, "note").slice(0, 300) || null,
      },
      str(form, "previous") || undefined,
    );
  } catch (e) {
    console.error("[coupons] save failed:", e);
    return { error: "השמירה נכשלה. נסו שוב בעוד רגע." };
  }
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/coupons", "layout");
  redirect("/admin/coupons/?saved=1");
}

export async function deleteCouponAction(form: FormData): Promise<void> {
  await requireAdmin("coupons");
  const db = getDb();
  if (db) await deleteCoupon(db, str(form, "code"));
  revalidatePath("/admin/coupons", "layout");
  redirect("/admin/coupons/");
}

export async function importCouponsAction(_: ActionState): Promise<ActionState> {
  await requireAdmin("coupons");
  const db = getDb();
  if (!db) return { error: "מסד הנתונים לא מחובר." };
  let n: number;
  try {
    n = await importEnvCoupons(db);
  } catch (e) {
    console.error("[coupons] import failed:", e);
    return { error: "הייבוא נכשל. נסו שוב בעוד רגע." };
  }
  revalidatePath("/admin/coupons", "layout");
  // the import box goes away with the page's refresh, so the result is told on the list
  redirect(`/admin/coupons/?imported=${n}`);
}
