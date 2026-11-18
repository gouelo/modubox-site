import { describe, expect, it } from "vitest";
import { israeliPhone, normalizePhone, telHref, validPhone, waNumber } from "../src/lib/phone";
import { customerKey } from "../src/lib/orders";

// Phone numbers from 0 or with Israel's country code, as the forms and the WhatsApp links read them.
describe("Israeli phone numbers", () => {
  const same = ["050-1234567", "0501234567", "050 123 4567", "+972 50-123-4567", "+972501234567", "972501234567", "972-50-1234567", "00972501234567", "+972 (0)50-1234567", "+9720501234567", "‏050-1234567"];
  it.each(same)("%s is 0501234567", (p) => {
    expect(israeliPhone(p)).toBe("0501234567");
    expect(validPhone(p, "he")).toBe(true);
    expect(normalizePhone(p)).toBe("050-1234567");
    expect(waNumber(p)).toBe("972501234567");
    expect(telHref(p)).toBe("tel:+972501234567");
    expect(customerKey(p)).toBe("0501234567");
  });

  it("takes landlines too", () => {
    expect(normalizePhone("+972 2-123-4567")).toBe("02-1234567");
    expect(normalizePhone("09-7654321")).toBe("09-7654321");
    expect(waNumber("02-1234567")).toBe("97221234567");
  });

  it.each(["", "050-12345", "050-12345678", "+972 50-12", "12345", "+1 202 555 0100", "abc"])("refuses %j on the Hebrew site", (p) => {
    expect(israeliPhone(p)).toBeNull();
    expect(validPhone(p, "he")).toBe(false);
  });

  it("takes a number from abroad only on the English site, kept as +digits", () => {
    expect(validPhone("+44 20 7946 0958", "en")).toBe(true);
    expect(validPhone("+44 20 7946 0958", "he")).toBe(false);
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(waNumber("+44 20 7946 0958")).toBe("442079460958");
  });
});
