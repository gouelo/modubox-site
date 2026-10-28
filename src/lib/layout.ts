// Where each add-on sits on the shed walls. Used by the 3D view, and to know
// when a wall is full (so the + button can be disabled).
import type { Product, Selections } from "./types";

export type Wall = "front" | "right" | "back" | "left";
export type SlotKind = "door" | "double-door" | "extra-door" | "glass" | "window";

export interface Slot {
  wall: Wall;
  index: number;
  /** how many 1-metre modules it spans */
  span: number;
  kind: SlotKind;
  shutter?: boolean;
}

export interface ShedLayout {
  modules: Record<Wall, number>;
  slots: Slot[];
  /** add-ons that did not fit, by id */
  overflow: Record<string, number>;
  free: number;
}

const ORDER: Record<Exclude<SlotKind, "door" | "double-door">, Wall[]> = {
  "extra-door": ["back", "right", "left", "front"],
  glass: ["front", "left", "right", "back"],
  window: ["right", "left", "back", "front"],
};

export function moduleCount(lengthM: number): number {
  return Math.max(1, Math.round(lengthM));
}

export function layoutShed(product: Pick<Product, "widthM" | "depthM">, sel: Selections): ShedLayout {
  const modules: Record<Wall, number> = {
    front: moduleCount(product.widthM),
    back: moduleCount(product.widthM),
    left: moduleCount(product.depthM),
    right: moduleCount(product.depthM),
  };
  const used: Record<Wall, boolean[]> = {
    front: Array(modules.front).fill(false),
    back: Array(modules.back).fill(false),
    left: Array(modules.left).fill(false),
    right: Array(modules.right).fill(false),
  };
  const slots: Slot[] = [];
  const overflow: Record<string, number> = {};

  // main door at the end of the front wall; double door takes two modules
  const double = sel["double-door"] === 1 && modules.front >= 2;
  if (double) {
    const i = modules.front - 2;
    used.front[i] = used.front[i + 1] = true;
    slots.push({ wall: "front", index: i, span: 2, kind: "double-door" });
  } else {
    const i = modules.front - 1;
    used.front[i] = true;
    slots.push({ wall: "front", index: i, span: 1, kind: "door" });
  }

  const place = (kind: keyof typeof ORDER, addonId: string, count: number, extra?: Partial<Slot>) => {
    for (let n = 0; n < count; n++) {
      let placed = false;
      for (const wall of ORDER[kind]) {
        const i = used[wall].indexOf(false);
        if (i >= 0) {
          used[wall][i] = true;
          slots.push({ wall, index: i, span: 1, kind, ...extra });
          placed = true;
          break;
        }
      }
      if (!placed) overflow[addonId] = (overflow[addonId] ?? 0) + 1;
    }
  };

  const glass = sel["glass-wall"];
  if (glass === "glass" || glass === "glass-shutter") place("glass", "glass-wall", 1, { shutter: glass === "glass-shutter" });
  place("extra-door", "extra-door", Number(sel["extra-door"] ?? 0));
  place("window", "sliding-window", Number(sel["sliding-window"] ?? 0));

  const free = Object.values(used).reduce((s, w) => s + w.filter((u) => !u).length, 0);
  return { modules, slots, overflow, free };
}

/** Add-ons that take a whole wall module. */
export const MODULE_ADDONS = new Set(["extra-door", "sliding-window", "glass-wall"]);
