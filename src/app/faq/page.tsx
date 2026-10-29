import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { Icon } from "@/components/Icon";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "שאלות נפוצות",
  description: "תשובות על מחסני מודובוקס: הובלה והתקנה, משטח, אחריות, תשלומים ועוד.",
};

export default function FaqPage() {
  return (
    <div className="container-x max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold sm:text-5xl">שאלות נפוצות</h1>
      <div className="mt-8">
        <Faq />
      </div>
      <p className="mt-8 text-ink-soft">לא מצאתם תשובה?</p>
      <a href={waLink("היי מודובוקס, יש לי שאלה:")} target="_blank" rel="noopener" className="btn-wa mt-3">
        <Icon name="whatsapp" /> שאלו אותנו בוואטסאפ
      </a>
    </div>
  );
}
