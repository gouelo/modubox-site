import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm } from "@/components/admin/ContentForms";
import { NoDatabase, PageTitle, Section } from "@/components/admin/ui";
import { republishAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import { uploadsEnabled } from "@/lib/admin/uploads";
import { listPosts } from "@/lib/blog";
import { fileRules, mergeRules } from "@/lib/seo/redirects";
import { blockedCrawlers } from "@/lib/seo/settings";
import { readSeo } from "@/lib/seo/store";
import { redirects } from "@/db/schema";

export const metadata = { title: "תוכן ו־SEO" };

/** The content module's start: what is set, and a way into each part. */
export default async function ContentHome() {
  await requireAdmin("content");
  const db = getDb();
  const seo = await readSeo();
  const rows = db ? await db.select().from(redirects).catch(() => []) : [];
  const rules = mergeRules(fileRules(), rows);
  const posts = await listPosts();
  const faqCount = [...seo.faqs.values()].reduce((n, f) => n + f.length, 0);
  const cards = [
    { href: "/admin/content/pages/", title: "דפים ו־SEO", text: `כותרות, תיאורים, תמונות שיתוף, שאלות ותשובות ועובדות למוצרים. ${seo.pages.size} דפים עם הגדרות, ${faqCount} שאלות.` },
    { href: "/admin/content/blog/", title: "בלוג", text: `${posts.length} מאמרים באתר. כתיבה ועריכה, טיוטות, תמונות.` },
    { href: "/admin/content/redirects/", title: "הפניות 301", text: `${rules.filter((r) => r.enabled).length} הפניות פעילות, מתוכן ${rules.filter((r) => r.origin === "admin").length} מהטבלה.` },
    { href: "/admin/content/business/", title: "פרטי העסק", text: "שם, כתובת, שעות, פרופילים ודירוג: מה שגוגל ומנועי AI יודעים על העסק." },
    { href: "/admin/content/llms/", title: "llms.txt", text: "המדריך לאתר בשביל ChatGPT, Claude, Perplexity ושאר מנועי ה־AI." },
    { href: "/admin/content/crawlers/", title: "סורקי AI ו־robots", text: `${blockedCrawlers(seo.crawlers).length ? `${blockedCrawlers(seo.crawlers).length} סורקים חסומים` : "כל הסורקים מורשים"}. תצוגה של robots.txt.` },
    { href: "/admin/content/sitemap/", title: "Sitemap", text: "כל הכתובות שגוגל מקבל, בלי הדפים המוסתרים." },
    { href: "/admin/content/health/", title: "בדיקת דף", text: "בדיקה של דף חי: כותרת, תיאור, H1, תמונות, נתונים מובנים ומוכנות ל־AI." },
  ];
  return (
    <>
      <PageTitle title="תוכן ו־SEO" sub="כל שינוי כאן מתעדכן באתר תוך דקה, בלי פריסה חדשה." />
      {!db ? <NoDatabase /> : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="card block h-full p-4 transition hover:border-brand/40 hover:shadow-lift">
              <h2 className="text-base font-extrabold">{c.title} ←</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{c.text}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Section title="פרסום מחדש" className="mt-5">
        <p className="text-sm leading-6 text-ink-soft">כל שמירה כבר מעדכנת את האתר. אם משהו לא התעדכן, הכפתור בונה מחדש את כל הדפים, ה־sitemap, robots.txt ו־llms.txt בכניסה הבאה אליהם.</p>
        <ActionForm action={republishAction} submit="פרסום מחדש של כל האתר" okText="בוצע. הדפים ייבנו מחדש בכניסה הבאה." />
      </Section>
      {!uploadsEnabled() ? (
        <p className="mt-4 text-sm text-ink-soft">
          להעלאת תמונות ישירות מכאן: ב־Vercel, Storage → Create → Blob (Public), ולחבר לפרויקט. עד אז שדות התמונה מקבלים כתובת.
        </p>
      ) : null}
    </>
  );
}
