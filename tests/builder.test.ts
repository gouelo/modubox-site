import { describe, expect, it } from "vitest";
import { builderSteps, chosenIn, PROFILE_ADDON, profileAddon } from "../src/lib/builder";
import { addonsFor, getProduct, plain } from "../src/lib/catalog";
import { defaultSelections, quote } from "../src/lib/pricing";
import { configMessage } from "../src/lib/whatsapp";

const p32 = getProduct("modubox-3x2")!;

describe("add-ons builder steps", () => {
  it("has no size step: doors and windows → power → interior → summary", () => {
    expect(builderSteps(p32).map((s) => s.id)).toEqual(["openings", "power", "interior", "summary"]);
  });

  it("puts the profile colour up front, and every other add-on in exactly one step", () => {
    for (const slug of ["modubox-1x0-8", "modubox-3x2", "modubox-6x3"]) {
      const p = getProduct(slug)!;
      expect(profileAddon(p)?.choices?.map((c) => c.id)).toEqual(["white", "black"]);
      const placed = builderSteps(p).flatMap((s) => s.addons.map((a) => a.id));
      expect([PROFILE_ADDON, ...placed].sort()).toEqual(addonsFor(p).map((a) => a.id).sort());
    }
  });

  it("offers only the add-ons Yoel kept", () => {
    const ids = addonsFor(p32).map((a) => a.id);
    for (const gone of ["kip-window", "mosquito-net", "solar-light", "platform", "size-shortening"]) expect(ids).not.toContain(gone);
    for (const kept of ["extra-door", "double-door", "sliding-window", "glass-wall", "electric-panel", "ac"]) expect(ids).toContain(kept);
  });

  it("products without add-ons get only the summary", () => {
    expect(builderSteps(getProduct("gilboa-m")!).map((s) => s.id)).toEqual(["summary"]);
  });

  it("counts what was chosen in a step, ignoring choice defaults", () => {
    const openings = builderSteps(p32).find((s) => s.id === "openings")!;
    expect(chosenIn(openings, defaultSelections(p32))).toBe(0);
    expect(chosenIn(openings, { ...defaultSelections(p32), "sliding-window": 2, "glass-wall": "glass" })).toBe(2);
  });
});

describe("configuration WhatsApp message", () => {
  it("lists the base price, each add-on and the total", () => {
    const q = quote(p32, { ...defaultSelections(p32), "double-door": 1, "sliding-window": 2, ac: "tornado-12" });
    expect(q.total).toBe(7800 + 1190 + 2 * 1190 + 1400);
    const msg = plain(configMessage(p32, q));
    expect(msg).toContain("מחסן מודובוקס 3×2");
    expect(msg).toContain("מחיר בסיס: 7,800");
    expect(msg).toContain("חלון הזזה כולל רשת ×2 – 2,380");
    expect(msg).toContain('סה"כ: 12,770');
    expect(msg).not.toContain("בתיאום");
  });
});

describe("WPC parquet floor", () => {
  it("sits in the interior step of every Modubox shed", () => {
    for (const slug of ["modubox-1x0-8", "modubox-3x2", "modubox-6x3"]) {
      const interior = builderSteps(getProduct(slug)!).find((s) => s.id === "interior")!;
      expect(interior.addons[0].id, slug).toBe("wpc-floor");
    }
    expect(addonsFor(getProduct("gilboa-m")!).map((a) => a.id)).not.toContain("wpc-floor");
  });

  it("costs 120 ₪ per m² of the shed's floor, in each of its 3 colours", () => {
    const floor = (slug: string) => addonsFor(getProduct(slug)!).find((a) => a.id === "wpc-floor")!;
    expect(floor("modubox-3x2").choices!.map((c) => [c.id, c.price])).toEqual([["none", 0], ["grey", 720], ["teak", 720], ["light", 720]]);
    expect(floor("modubox-5x3").choices![1].price).toBe(1800);
    expect(floor("modubox-1x0-8").choices![1].price).toBe(96);
  });

  it("is carried into the quote and the WhatsApp message", () => {
    const q = quote(p32, { ...defaultSelections(p32), "wpc-floor": "teak" });
    expect(q.total).toBe(7800 + 720);
    expect(plain(configMessage(p32, q))).toContain('רצפת WPC איכותית: חום טיק (6 מ"ר) – 720');
    expect(quote(p32, defaultSelections(p32)).lines.map((l) => l.id)).not.toContain("wpc-floor");
  });
});
