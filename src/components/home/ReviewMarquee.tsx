import { dict, type Locale } from "@/i18n";
import type { Review } from "@/lib/catalog";
import { Marquee } from "../Marquee";
import { ReviewCard } from "../ReviewCard";

/**
 * Every review, drifting slowly across (paused on hover, or with its button).
 * With reduced motion it is a row you scroll by hand.
 */
export function ReviewMarquee({ reviews, locale }: { reviews: Review[]; locale: Locale }) {
  return (
    <Marquee label={dict(locale).home.reviews.title} mask="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]" speed="animate-marquee ltr:animate-marquee-ltr" className="gap-4 py-2 sm:gap-5">
      {reviews.map((r) => (
        <div key={r.name} className="w-[19rem] shrink-0 sm:w-[24rem]">
          <ReviewCard {...r} locale={locale} />
        </div>
      ))}
    </Marquee>
  );
}
