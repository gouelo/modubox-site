import { addonsFor } from "./catalog";
import type { Addon, Product, Selections } from "./types";

export type StepIcon = "ruler" | "palette" | "door" | "bolt" | "shelf" | "layers" | "plus" | "check";

export interface BuilderStep {
  id: string;
  title: string;
  subtitle: string;
  icon: StepIcon;
  addons: Addon[];
}

/**
 * The steps of the add-ons builder on a product page. Add-ons are placed by
 * their `group` in data/addons.json; a group that no step names lands in
 * "תוספות נוספות", so a new group always shows up.
 */
const ADDON_STEPS: { id: string; title: string; subtitle: string; icon: StepIcon; groups: string[] }[] = [
  { id: "design", title: "עיצוב", subtitle: "באיזה צבע תרצו את השלדה?", icon: "palette", groups: ["עיצוב"] },
  { id: "openings", title: "דלתות וחלונות", subtitle: "פתחים, אור טבעי וגישה נוחה", icon: "door", groups: ["דלתות וחלונות"] },
  { id: "power", title: "חשמל ומיזוג", subtitle: "להפוך את המחסן לחדר שאפשר לעבוד בו", icon: "bolt", groups: ["חשמל ומיזוג"] },
  { id: "interior", title: "פנים ואוורור", subtitle: "סדר בפנים ואוויר נקי", icon: "shelf", groups: ["אחסון פנימי", "אוורור"] },
  { id: "base", title: "בסיס והתאמה", subtitle: "על מה המחסן יעמוד, ובאיזו מידה בדיוק", icon: "layers", groups: ["בסיס", "התאמה אישית"] },
];

export function builderSteps(product: Product): BuilderStep[] {
  const all = addonsFor(product);
  const steps: BuilderStep[] = [
    { id: "size", title: "מידה", subtitle: "בחרו את גודל המחסן", icon: "ruler", addons: [] },
  ];
  const placed = new Set<string>();
  for (const s of ADDON_STEPS) {
    const addons = all.filter((a) => s.groups.includes(a.group));
    addons.forEach((a) => placed.add(a.id));
    if (addons.length) steps.push({ id: s.id, title: s.title, subtitle: s.subtitle, icon: s.icon, addons });
  }
  const rest = all.filter((a) => !placed.has(a.id));
  if (rest.length) steps.push({ id: "more", title: "תוספות נוספות", subtitle: "עוד אפשרויות למחסן שלכם", icon: "plus", addons: rest });
  steps.push({ id: "summary", title: "סיכום", subtitle: "כך נראה המחסן שבחרתם", icon: "check", addons: [] });
  return steps;
}

/** How many add-ons in a step differ from the starting configuration. */
export function chosenIn(step: BuilderStep, selections: Selections): number {
  return step.addons.filter((a) => {
    const v = selections[a.id];
    if (a.kind === "choice") return v !== undefined && v !== (a.default ?? a.choices?.[0]?.id);
    return typeof v === "number" && v > 0;
  }).length;
}
