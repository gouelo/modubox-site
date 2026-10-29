import { Icon } from "./Icon";
import { Stars } from "./Stars";

export function ReviewCard({ name, text, date, rating }: { name: string; text: string; date: string; rating: number }) {
  const d = new Date(date);
  return (
    <figure className="card flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <Stars value={rating} />
        <Icon name="google" className="size-5 text-ink/30" />
      </div>
      <blockquote className="line-clamp-4 flex-1 leading-7 text-ink">“{text}”</blockquote>
      <figcaption className="flex items-center gap-3 border-t border-line pt-3">
        <span className="grid size-10 place-items-center rounded-full bg-brand-tint font-bold text-brand-dark">{name.trim()[0]}</span>
        <span>
          <span className="block font-bold">{name}</span>
          <span className="block text-xs text-ink-soft">{d.toLocaleDateString("he-IL", { month: "long", year: "numeric" })} · ביקורת בגוגל</span>
        </span>
      </figcaption>
    </figure>
  );
}
