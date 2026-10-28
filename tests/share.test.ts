import { describe, expect, it } from "vitest";
import { getProduct, plain } from "../src/lib/catalog";
import { quote } from "../src/lib/pricing";
import { decodeSelections, encodeSelections } from "../src/lib/share";
import { configMessage } from "../src/lib/whatsapp";

describe("share + whatsapp", () => {
  it("round-trips a configuration through the URL", () => {
    const s = { "sliding-window": 2, ac: "tornado-16", "profile-color": "black" };
    expect(decodeSelections(encodeSelections(s))).toEqual(s);
    expect(decodeSelections("not-valid!!")).toBeNull();
  });

  it("writes a readable Hebrew WhatsApp message with the total", () => {
    const p = getProduct("modubox-3x2")!;
    const msg = plain(configMessage(p, quote(p, { "sliding-window": 1 }), "https://x.test/#c=1"));
    expect(msg).toContain("מחסן מודובוקס 3×2");
    expect(msg).toContain("חלון הזזה כולל רשת");
    expect(msg).toMatch(/8,990/);
    expect(msg).toContain("https://x.test/#c=1");
  });
});
