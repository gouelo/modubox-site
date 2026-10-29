import { Icon } from "./Icon";
import { Stars } from "./Stars";

export function ReviewCard({ name, text, date, rating }: { name: string; text: string; date: string; rating: number }) {
  const d = new Date(date);
  return (
    <figure className="flex h-full flex-col gap-4 rounded-3xl bg-sand p-6">
      <div className="flex items-center justify-between">
        <Stars value={rating} />
        <Icon name="google" className="size-5 text-ink/25" />
      </div>
      <blockquote className="line-clamp-5 flex-1 text-xl font-medium leading-8 text-ink">“{text}”</blockquote>
      <figcaption className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-ink font-bold text-white">{name.trim()[0]}</span>
        <span>
          <span className="block font-bold">{name}</span>
          <span className="block text-xs text-ink-soft">{d.toLocaleDateString("he-IL", { month: "long", year: "numeric" })} · ביקורת בגוגל</span>
        </span>
      </figcaption>
    </figure>
  );
}
