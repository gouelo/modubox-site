import { afterEach, describe, expect, it } from "vitest";
import { getProduct, plain, site } from "../src/lib/catalog";
import { design3dLink, productMessage } from "../src/lib/whatsapp";

const p = getProduct("modubox-3x2")!;

describe("whatsapp + 3D design link", () => {
  afterEach(() => {
    site.design3d.url = "";
  });

  it("writes a readable Hebrew WhatsApp message with the base price", () => {
    const msg = plain(productMessage(p));
    expect(msg).toContain("מחסן מודובוקס 3×2");
    expect(msg).toContain("7,800");
  });

  it("opens WhatsApp naming the product while no configurator URL is set", () => {
    const link = design3dLink(p);
    expect(link).toMatch(/^https:\/\/wa\.me\/972529555057\?text=/);
    expect(plain(decodeURIComponent(link.split("text=")[1]))).toContain("לעצב בתלת־ממד את מחסן מודובוקס 3×2");
    expect(decodeURIComponent(design3dLink())).toContain("בתלת־ממד");
  });

  it("points at the configurator once site.design3d.url is set", () => {
    site.design3d.url = "https://3d.example.com/?model={slug}";
    expect(design3dLink(p)).toBe("https://3d.example.com/?model=modubox-3x2");
    expect(design3dLink()).toBe("https://3d.example.com/");
  });
});
