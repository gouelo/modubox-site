import Link from "next/link";
import { ConfirmForm, PostForm } from "@/components/admin/ContentForms";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PageTitle } from "@/components/admin/ui";
import { deletePostAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import { uploadsEnabled } from "@/lib/admin/uploads";
import { filePosts, rowToPost } from "@/lib/blog";
import { israelDate } from "@/lib/admin/time";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "עריכת מאמר" };

/** A post's editor; without a slug, a new post. */
export default async function EditPost({ searchParams }: { searchParams: Promise<{ slug?: string; saved?: string }> }) {
  await requireAdmin("content");
  const { slug = "", saved } = await searchParams;
  const { posts } = await readSeo();
  const row = posts.find((r) => r.slug === slug);
  const file = filePosts().find((p) => p.slug === slug);
  const post = row ? rowToPost(row) : file;
  if (slug && !post) return <PageTitle title="המאמר לא נמצא" sub={<Link href="/admin/content/blog/">חזרה לבלוג</Link>} />;
  const today = israelDate(new Date());
  return (
    <>
      <PageTitle
        title={post ? post.title : "מאמר חדש"}
        sub={
          post && (row?.status ?? "published") === "published" ? (
            <a href={`/blog/${encodeURIComponent(post.slug)}/`} target="_blank" rel="noopener" className="hover:underline">
              צפייה באתר ↗
            </a>
          ) : row?.status === "draft" ? (
            "טיוטה: לא מופיעה באתר"
          ) : undefined
        }
      />
      {saved ? (
        <p role="status" className="mb-4 text-sm font-semibold text-emerald-700">
          ✓ נשמר.
        </p>
      ) : null}
      <div className="card p-4 sm:p-5">
        <PostForm
          previousSlug={post?.slug ?? ""}
          uploads={uploadsEnabled()}
          post={{
            slug: post?.slug ?? "",
            title: post?.title ?? "",
            seoTitle: row ? (row.seoTitle ?? "") : post && post.seoTitle !== post.title ? post.seoTitle : "",
            description: post?.description ?? "",
            date: post?.date ?? today,
            updated: row ? (row.updated ?? "") : (post?.updated ?? ""),
            cover: post?.cover ?? "",
            coverAlt: post?.coverAlt ?? "",
            categories: (post?.categories ?? []).join(", "),
            body: post?.body ?? "",
            status: row?.status ?? (post ? "published" : "draft"),
          }}
        />
      </div>
      {row ? (
        <ConfirmForm action={deletePostAction} confirm={file ? "לבטל את השינויים ולחזור לגרסה מהקובץ?" : "למחוק את המאמר? אי אפשר לשחזר."} className="mt-5">
          <input type="hidden" name="slug" value={row.slug} />
          <SubmitButton className="btn-ghost text-rose-700" pendingText="מוחק…">
            {file ? "ביטול השינויים (חזרה לגרסה מהקובץ)" : "מחיקת המאמר"}
          </SubmitButton>
        </ConfirmForm>
      ) : null}
    </>
  );
}
