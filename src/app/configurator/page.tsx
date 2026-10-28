import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfiguratorPage } from "./ConfiguratorPage";

export const metadata: Metadata = {
  title: "קונפיגורטור 3D – עצבו את המחסן שלכם",
  description: "בחרו מידה ותוספות – דלת כפולה, חלונות, ויטרינה, מזגן ומדפים – וראו את מחסן מודובוקס שלכם בתלת־ממד עם מחיר בזמן אמת.",
};

export default function Page() {
  return (
    <div className="container-x py-8">
      <header className="mb-6 max-w-3xl">
        <p className="eyebrow">קונפיגורטור 3D</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">עצבו את מחסן החלומות שלכם</h1>
        <p className="mt-3 text-lg text-ink-soft">בחרו מידה, הוסיפו תוספות וסובבו את המחסן. המחיר מתעדכן בזמן אמת.</p>
      </header>
      <Suspense>
        <ConfiguratorPage />
      </Suspense>
    </div>
  );
}
