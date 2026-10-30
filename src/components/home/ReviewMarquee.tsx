import { ReviewCard } from "../ReviewCard";

type Review = { name: string; text: string; date: string; rating: number };

/**
 * Every review, drifting slowly across (paused on hover). With reduced motion
 * it is a row you scroll by hand.
 */
export function ReviewMarquee({ reviews }: { reviews: Review[] }) {
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto">
      <div className="flex w-max animate-marquee gap-4 py-2 group-hover:[animation-play-state:paused] motion-reduce:animate-none sm:gap-5">
        {[0, 1].map((copy) =>
          reviews.map((r) => (
            <div key={`${copy}-${r.name}`} className="w-[19rem] shrink-0 sm:w-[24rem]" aria-hidden={copy === 1 || undefined}>
              <ReviewCard {...r} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
