import { Icon } from "./Icon";

export function Stars({ value = 5, className = "size-4" }: { value?: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-star" aria-label={`${value} מתוך 5 כוכבים`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" className={`${className} ${i < Math.round(value) ? "" : "opacity-25"}`} />
      ))}
    </span>
  );
}
