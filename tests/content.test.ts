import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { faqGroups } from "../src/lib/catalog";

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(tsx?|json|md)$/.test(e.name) ? [p] : [];
  });
}

describe("site wording (round 8)", () => {
  it('says "הובלה והתקנה", never "משלוח"', () => {
    const hits = ["src", "data", "content"].flatMap(files).filter((f) => fs.readFileSync(f, "utf8").includes("משלוח"));
    expect(hits).toEqual([]);
  });
});

describe("faq", () => {
  it("every group has questions, and every photo exists", () => {
    for (const g of faqGroups) {
      expect(g.items.length).toBeGreaterThan(0);
      const photos = [g.image, ...g.items.flatMap((i) => (Array.isArray(i.media) ? i.media : []))].filter((m) => !!m);
      for (const m of photos) expect(fs.existsSync(path.join("public/images", m.src)), m.src).toBe(true);
    }
  });
});
