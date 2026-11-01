import { dict, type Locale } from "@/i18n";
import { Icon } from "./Icon";

export function Stars({ value = 5, className = "size-4", locale = "he" }: { value?: number; className?: string; locale?: Locale }) {
  return (
    <span className="inline-flex gap-0.5 text-star" role="img" aria-label={dict(locale).common.starsOutOf5(value)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" className={`${className} ${i < Math.round(value) ? "" : "opacity-25"}`} />
      ))}
    </span>
  );
}
