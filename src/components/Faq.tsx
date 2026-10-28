import { faq } from "@/lib/catalog";
import { Icon } from "./Icon";

export function Faq({ limit }: { limit?: number }) {
  const items = limit ? faq.slice(0, limit) : faq;
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-white">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-lg font-bold">
            {f.q}
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sand transition group-open:rotate-45 group-open:bg-brand group-open:text-white">
              <Icon name="plus" className="size-4" />
            </span>
          </summary>
          <p className="pb-5 leading-8 text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
