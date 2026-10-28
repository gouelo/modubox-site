import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, children, center = false }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={`mb-10 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="h-section">{title}</h2>
      {children && <p className="mt-4 text-lg leading-8 text-ink-soft">{children}</p>}
    </div>
  );
}
