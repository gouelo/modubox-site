import { describe, expect, it } from "vitest";
import { builderSteps, chosenIn } from "../src/lib/builder";
import { addonsFor, getProduct, plain } from "../src/lib/catalog";
import { defaultSelections, quote } from "../src/lib/pricing";
import { configMessage } from "../src/lib/whatsapp";

const p32 = getProduct("modubox-3x2")!;

describe("add-ons builder steps", () => {
  it("runs size → design → doors and windows → power → interior → base → summary", () => {
    expect(builderSteps(p32).map((s) => s.id)).toEqual(["size", "design", "openings", "power", "interior", "base", "summary"]);
  });

  it("places every add-on a product offers in exactly one step", () => {
    for (const slug of ["modubox-1x0-8", "modubox-3x2", "modubox-6x3"]) {
      const p = getProduct(slug)!;
      const placed = builderSteps(p).flatMap((s) => s.addons.map((a) => a.id));
      expect(placed.sort()).toEqual(addonsFor(p).map((a) => a.id).sort());
    }
  });

  it("products without add-ons get only size and summary", () => {
    expect(builderSteps(getProduct("gilboa-m")!).map((s) => s.id)).toEqual(["size", "summary"]);
  });

  it("counts what was chosen in a step, ignoring choice defaults", () => {
    const openings = builderSteps(p32).find((s) => s.id === "openings")!;
    expect(chosenIn(openings, defaultSelections(p32))).toBe(0);
    expect(chosenIn(openings, { ...defaultSelections(p32), "sliding-window": 2, "glass-wall": "glass" })).toBe(2);
  });
});

describe("configuration WhatsApp message", () => {
  it("lists the base price, each add-on and the total, and marks price-on-request items", () => {
    const q = quote(p32, { ...defaultSelections(p32), "double-door": 1, "sliding-window": 2, ac: "tornado-12", "kip-window": 1 });
    expect(q.total).toBe(7800 + 1190 + 2 * 1190 + 1400);
    const msg = plain(configMessage(p32, q));
    expect(msg).toContain("מחסן מודובוקס 3×2");
    expect(msg).toContain("מחיר בסיס: 7,800");
    expect(msg).toContain("חלון הזזה כולל רשת ×2 – 2,380");
    expect(msg).toContain("חלון קיפ – מחיר בתיאום");
    expect(msg).toContain('סה"כ: 12,770');
    expect(msg).toContain("בתיאום");
  });
});
