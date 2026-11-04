"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { KeyFact, PostStatus } from "@/db/schema";
import { expireRedirects } from "@/lib/seo/redirect-cache";
import { republishSite } from "@/lib/seo/revalidate";
import { AI_CRAWLERS, type AiCrawlers, type Business } from "@/lib/seo/settings";
import type { ActionState } from "./actions";
import { deletePost, deleteRedirect, importPosts, importRedirects, saveFaqs, savePageSeo, savePost, saveRedirect, saveSetting } from "./content";
import { requireAdmin } from "./session";

/** The content module's server actions: each checks the session, saves, and rebuilds the public pages. */

const NO_DB: ActionState = { error: "מסד הנתונים לא מחובר, אז אי אפשר לשמור." };
const str = (form: FormData, key: string) => String(form.get(key) ?? "");

function json<T>(form: FormData, key: string, fallback: T): T {
  try {
    return JSON.parse(str(form, key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

async function guarded(fn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<ActionState>): Promise<ActionState> {
  await requireAdmin("content");
  const db = getDb();
  if (!db) return NO_DB;
  try {
    return await fn(db);
  } catch (e) {
    console.error("[content] save failed:", e);
    return { error: "השמירה נכשלה. נסו שוב בעוד רגע." };
  }
}

export async function savePageAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const path = str(form, "path");
    if (!path.startsWith("/")) return { error: "דף לא ידוע." };
    await savePageSeo(db, path, {
      title: str(form, "title"),
      description: str(form, "description"),
      ogImage: str(form, "ogImage"),
      canonical: str(form, "canonical"),
      noindex: form.get("noindex") === "on",
      keyFacts: json<KeyFact[]>(form, "facts", []),
    });
    if (form.has("faqs")) await saveFaqs(db, path, json<{ q: string; a: string }[]>(form, "faqs", []));
    republishSite();
    return { ok: true };
  });
}

export async function savePostAction(_: ActionState, form: FormData): Promise<ActionState> {
  let saved = "";
  const previous = str(form, "previousSlug");
  const state = await guarded(async (db) => {
    const r = await savePost(
      db,
      {
        slug: str(form, "slug"),
        title: str(form, "title"),
        seoTitle: str(form, "seoTitle"),
        description: str(form, "description"),
        date: str(form, "date"),
        updated: str(form, "updated"),
        cover: str(form, "cover"),
        coverAlt: str(form, "coverAlt"),
        categories: str(form, "categories").split(/[,،\n]/),
        body: str(form, "body"),
        status: str(form, "status") as PostStatus,
      },
      previous || undefined,
    );
    if (!r.ok) return { error: r.error };
    saved = r.slug;
    expireRedirects();
    republishSite();
    return { ok: true };
  });
  // a new post, or a new address: open the editor at its own address
  if (saved && saved !== previous) redirect(`/admin/content/blog/edit/?slug=${encodeURIComponent(saved)}&saved=1`);
  return state;
}

export async function deletePostAction(form: FormData): Promise<void> {
  await guarded(async (db) => {
    await deletePost(db, str(form, "slug"));
    republishSite();
    return { ok: true };
  });
  redirect("/admin/content/blog/");
}

export async function importPostsAction(_: ActionState): Promise<ActionState> {
  return guarded(async (db) => {
    const n = await importPosts(db);
    republishSite();
    revalidatePath("/admin/content/blog/");
    return { ok: true, message: `יובאו ${n} פוסטים לטבלה.` };
  });
}

export async function saveRedirectAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const id = Number(str(form, "id")) || undefined;
    const r = await saveRedirect(db, {
      id,
      source: str(form, "source"),
      destination: str(form, "destination"),
      statusCode: Number(str(form, "statusCode")) || 301,
      enabled: form.get("enabled") === "on",
      note: str(form, "note").trim() || null,
    });
    if (!r.ok) return { error: r.error };
    expireRedirects();
    revalidatePath("/admin/content/redirects/");
    return { ok: true };
  });
}

export async function deleteRedirectAction(form: FormData): Promise<void> {
  await guarded(async (db) => {
    await deleteRedirect(db, Number(str(form, "id")));
    expireRedirects();
    revalidatePath("/admin/content/redirects/");
    return { ok: true };
  });
}

export async function importRedirectsAction(_: ActionState): Promise<ActionState> {
  return guarded(async (db) => {
    const n = await importRedirects(db);
    expireRedirects();
    revalidatePath("/admin/content/redirects/");
    return { ok: true, message: `יובאו ${n} הפניות לטבלה.` };
  });
}

const BUSINESS_FIELDS: (keyof Business)[] = ["name", "legalName", "description", "phone", "email", "streetAddress", "city", "postalCode", "geo", "areaServed", "priceRange", "foundingYear"];

export async function saveBusinessAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const value: Partial<Business> = {};
    for (const k of BUSINESS_FIELDS) (value as Record<string, string>)[k] = str(form, k).trim().slice(0, 500);
    const lines = (k: string) => str(form, k).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    value.openingHours = lines("openingHours");
    value.sameAs = lines("sameAs").filter((u) => /^https?:\/\//.test(u));
    const rating = Number(str(form, "rating"));
    const reviews = Number(str(form, "reviewCount"));
    if (rating > 0 && rating <= 5) value.rating = rating;
    if (Number.isInteger(reviews) && reviews > 0) value.reviewCount = reviews;
    await saveSetting(db, "business", value);
    republishSite();
    return { ok: true };
  });
}

export async function saveLlmsAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    await saveSetting(db, "llms", { intro: str(form, "intro").trim().slice(0, 1000), extra: str(form, "extra").trim().slice(0, 20_000) });
    republishSite();
    return { ok: true };
  });
}

export async function saveCrawlersAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async (db) => {
    const value: AiCrawlers = {};
    for (const c of AI_CRAWLERS) value[c.agent] = form.get(c.agent) === "block" ? "block" : "allow";
    await saveSetting(db, "crawlers", value);
    republishSite();
    return { ok: true };
  });
}

export async function republishAction(_: ActionState): Promise<ActionState> {
  await requireAdmin("content");
  republishSite();
  return { ok: true };
}
