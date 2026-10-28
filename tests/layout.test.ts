import { describe, expect, it } from "vitest";
import { layoutShed } from "../src/lib/layout";

describe("layoutShed", () => {
  it("puts the main door on the front wall", () => {
    const l = layoutShed({ widthM: 3, depthM: 2 }, {});
    expect(l.modules).toEqual({ front: 3, back: 3, left: 2, right: 2 });
    expect(l.slots).toEqual([{ wall: "front", index: 2, span: 1, kind: "door" }]);
    expect(l.free).toBe(9);
  });

  it("a double door takes two front modules", () => {
    const l = layoutShed({ widthM: 2, depthM: 2 }, { "double-door": 1 });
    expect(l.slots[0]).toMatchObject({ kind: "double-door", span: 2, index: 0 });
  });

  it("reports add-ons that do not fit", () => {
    const l = layoutShed({ widthM: 1, depthM: 1 }, { "sliding-window": 4 });
    expect(l.slots.filter((s) => s.kind === "window")).toHaveLength(3);
    expect(l.overflow["sliding-window"]).toBe(1);
    expect(l.free).toBe(0);
  });

  it("places glass on the front wall first", () => {
    const l = layoutShed({ widthM: 3, depthM: 2 }, { "glass-wall": "glass-shutter" });
    expect(l.slots[1]).toMatchObject({ wall: "front", kind: "glass", shutter: true });
  });
});
