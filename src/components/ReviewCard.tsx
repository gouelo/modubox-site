import { dict, type Locale } from "@/i18n";
import { Icon } from "./Icon";
import { Stars } from "./Stars";

export function ReviewCard({ name, text, date, rating, locale }: { name: string; text: string; date: string; rating: number; locale: Locale }) {
  const d = new Date(date);
  const t = dict(locale).common;
  return (
    <figure className="flex h-full flex-col gap-4 rounded-3xl bg-sand p-6">
      <div className="flex items-center justify-between">
        <Stars locale={locale} value={rating} />
        <Icon name="google" className="size-5 text-ink/25" />
      </div>
      <blockquote className="line-clamp-5 flex-1 text-xl font-medium leading-8 text-ink">“{text}”</blockquote>
      <figcaption className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-ink font-bold text-white" aria-hidden="true">{name.trim()[0]}</span>
        <span>
          <span className="block font-bold">{name}</span>
          <span className="block text-xs text-ink-soft">{d.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "long", year: "numeric" })} · {t.googleReview}</span>
        </span>
      </figcaption>
    </figure>
  );
}
