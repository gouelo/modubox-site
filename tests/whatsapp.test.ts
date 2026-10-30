import { afterEach, describe, expect, it } from "vitest";
import { getProduct, plain, site } from "../src/lib/catalog";
import { configuratorModel, design3dLink, hasDesign3d } from "../src/lib/design3d";
import { productMessage } from "../src/lib/whatsapp";

const p = getProduct("modubox-3x2")!;
const url = site.design3d.url;

describe("whatsapp", () => {
  it("writes a readable Hebrew WhatsApp message with the base price", () => {
    const msg = plain(productMessage(p));
    expect(msg).toContain("מחסן מודובוקס 3×2");
    expect(msg).toContain("7,800");
  });
});

describe("3D configurator link", () => {
  afterEach(() => {
    site.design3d.url = url;
  });

  it("opens each Modubox shed on its own model", () => {
    expect(design3dLink(p)).toBe("https://web-production-950b8.up.railway.app/il?model=3x2");
    expect(design3dLink(getProduct("modubox-4x1")!)).toBe("https://web-production-950b8.up.railway.app/il?model=4x1");
    expect(configuratorModel(getProduct("modubox-6x3")!)).toBe("6x3");
  });

  it("opens the entry page without a model where there is none", () => {
    expect(design3dLink()).toBe("https://web-production-950b8.up.railway.app/il");
    expect(configuratorModel(getProduct("modubox-2x1-6")!)).toBeNull();
    expect(design3dLink(getProduct("modubox-2x1-6")!)).toBe("https://web-production-950b8.up.railway.app/il");
  });

  it("a product's configuratorModel overrides its dimensions", () => {
    expect(configuratorModel({ ...p, configuratorModel: "3x3" })).toBe("3x3");
    expect(configuratorModel({ ...p, configuratorModel: null })).toBeNull();
  });

  it("shows the button only for Modubox sheds, and only while a URL is set", () => {
    expect(hasDesign3d(p)).toBe(true);
    expect(hasDesign3d()).toBe(true);
    expect(hasDesign3d(getProduct("gilboa-m")!)).toBe(false);
    site.design3d.url = "";
    expect(hasDesign3d(p)).toBe(false);
  });

  it("keeps other query parameters when dropping the model", () => {
    site.design3d.url = "https://3d.example.com/il?f=d&model={model}&b=semi";
    expect(design3dLink(p)).toBe("https://3d.example.com/il?f=d&model=3x2&b=semi");
    expect(design3dLink()).toBe("https://3d.example.com/il?f=d&b=semi");
    site.design3d.url = "https://3d.example.com/il?model={model}&b=semi";
    expect(design3dLink()).toBe("https://3d.example.com/il?b=semi");
  });
});
