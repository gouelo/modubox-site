import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm } from "@/components/admin/ContentForms";
import { ResetForm } from "@/components/admin/ResetForm";
import { ReviewRows } from "@/components/admin/SiteListForms";
import { PageTitle } from "@/components/admin/ui";
import { saveReviewsAction } from "@/lib/admin/site-actions";
import { reviewsForm, savedTexts } from "@/lib/admin/site-texts";
import { requireAdmin } from "@/lib/admin/session";
import type { ReviewsPatch } from "@/lib/catalog-overrides";

export const dynamic = "force-dynamic";
export const metadata = { title: "ביקורות" };

/** The Google reviews shown on the site, in order. */
export default async function ReviewsPage() {
  await requireAdmin("site");
  const saved = (await savedTexts(getDb()!)).reviews as ReviewsPatch | undefined;
  return (
    <>
      <PageTitle
        title="ביקורות"
        sub={
          <>
            הביקורות מגוגל שמוצגות באתר, בסדר הזה. ביקורת בלי טקסט באנגלית לא מוצגת באתר באנגלית. הדירוג ומספר הביקורות: ב<Link href="/admin/site/" className="underline">פרטי העסק</Link>.
          </>
        }
      />
      <div className="card p-4">
        <ActionForm action={saveReviewsAction} submit="שמירת הביקורות">
          <ReviewRows rows={reviewsForm(saved)} />
        </ActionForm>
      </div>
      {saved ? <ResetForm kind="reviews" /> : null}
    </>
  );
}
