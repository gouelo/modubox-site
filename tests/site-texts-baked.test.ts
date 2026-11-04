import { describe, expect, it, vi } from "vitest";

// a build with the admin's texts: what scripts/catalog-sync.mjs would write
vi.mock("../data/catalog-overrides.json", () => ({
  default: {
    generatedAt: "2026-11-04T12:00:00Z",
    products: {},
    addons: {},
    site: { phone: "03-7654321", whatsapp: "972501112222", reviewCount: 250, en: { whatsappGreeting: "Hello there" } },
    promo: { enabled: true, eyebrow: "חדש", title: "מבצע חנוכה", text: "10% הנחה", endDate: "", cta: { label: "לחנות", href: "/shop/" }, en: { enabled: false, eyebrow: "", title: "", text: "", ctaLabel: "" } },
    faq: { groups: { payment: { items: [{ q: "שאלה אחת?", a: "תשובה." }] } } },
    reviews: { reviews: [{ name: "דנה", date: "2026-11-01", rating: 5, text: "מצוין", en: { name: "Dana", text: "Great" } }] },
  },
}));

const { catalog, promo } = await import("@/lib/catalog");

describe("the admin's texts, baked into a build", () => {
  it("show across the site in both languages", () => {
    expect(catalog("he").site.phone).toBe("03-7654321");
    expect(catalog("en").site.whatsapp).toBe("972501112222");
    expect(catalog("en").site.whatsappGreeting).toBe("Hello there");
    expect(catalog("he").site.reviewCount).toBe(250);
    expect(promo.title).toBe("מבצע חנוכה");
    expect(catalog("he").faqGroups.find((g) => g.id === "payment")!.items).toEqual([{ q: "שאלה אחת?", a: "תשובה." }]);
    expect(catalog("he").faqGroups.find((g) => g.id === "structure")!.items.length).toBeGreaterThan(1);
    expect(catalog("he").reviews).toEqual([{ name: "דנה", date: "2026-11-01", rating: 5, text: "מצוין" }]);
    expect(catalog("en").reviews).toEqual([{ name: "Dana", date: "2026-11-01", rating: 5, text: "Great" }]);
  });
});
