import { addonsFor } from "./catalog";
import type { Addon, Product, Selections } from "./types";

export type StepIcon = "door" | "bolt" | "shelf" | "plus" | "check";

export interface BuilderStep {
  id: string;
  title: string;
  subtitle: string;
  icon: StepIcon;
  addons: Addon[];
}

/** The add-on chosen up front, before the steps: the profiles' colour, white or black. */
export const PROFILE_ADDON = "profile-color";

/**
 * The steps of the add-ons builder on a product page. The size is the page's
 * own and the profile colour is chosen above the steps, so the steps are only
 * add-ons, placed by their `group` in data/addons.json; a group that no step
 * names lands in "תוספות נוספות", so a new group always shows up.
 */
const ADDON_STEPS: { id: string; title: string; subtitle: string; icon: StepIcon; groups: string[] }[] = [
  { id: "openings", title: "דלתות וחלונות", subtitle: "פתחים, אור טבעי וגישה נוחה", icon: "door", groups: ["דלתות וחלונות"] },
  { id: "power", title: "חשמל ומיזוג", subtitle: "להפוך את המחסן לחדר שאפשר לעבוד בו", icon: "bolt", groups: ["חשמל ומיזוג"] },
  { id: "interior", title: "פנים ורצפה", subtitle: "רצפה, סדר בפנים ואוויר נקי", icon: "shelf", groups: ["רצפה", "אחסון פנימי", "אוורור"] },
];

/** The profile-colour add-on, when the product offers it. */
export function profileAddon(product: Product): Addon | undefined {
  return addonsFor(product).find((a) => a.id === PROFILE_ADDON);
}

export function builderSteps(product: Product): BuilderStep[] {
  const all = addonsFor(product).filter((a) => a.id !== PROFILE_ADDON);
  const steps: BuilderStep[] = [];
  const placed = new Set<string>();
  for (const s of ADDON_STEPS) {
    // in the order of the step's groups (the floor before shelves), stable within a group
    const addons = s.groups.flatMap((g) => all.filter((a) => a.group === g));
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
