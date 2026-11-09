import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, can, checkPassword, createSessionToken, homeFor, passwordRole, readSessionToken, safeNext, sessionSecret } from "../src/lib/admin/auth";
import { allowedMoves, canTransition, STATUS_LABEL } from "../src/lib/admin/status";
import { israelDayStart, israelDate } from "../src/lib/admin/time";
import { csvCell } from "../src/lib/admin/csv";
import { emailConfig } from "../src/lib/notify";

describe("admin sign-in", () => {
  const env = { ADMIN_PASSWORD: "correct horse battery" };

  it("is locked without ADMIN_PASSWORD", async () => {
    expect(sessionSecret({})).toBeNull();
    expect(await checkPassword("anything", {})).toBe(false);
    const token = await createSessionToken("x", "admin", "owner");
    expect(await readSessionToken(null, token)).toBeNull();
  });

  it("checks the password", async () => {
    expect(await checkPassword("correct horse battery", env)).toBe(true);
    expect(await checkPassword("correct horse", env)).toBe(false);
    expect(await checkPassword("", env)).toBe(false);
  });

  it("a session cookie is signed, expires, and ends when the password changes", async () => {
    const secret = sessionSecret(env)!;
    const now = Date.UTC(2026, 10, 4);
    const token = await createSessionToken(secret, "admin", "owner", now);
    expect(await readSessionToken(secret, token, now + 1000)).toMatchObject({ user: "admin", role: "owner" });
    expect(await readSessionToken(secret, token, now + 31 * 86_400_000)).toBeNull();
    expect(await readSessionToken(sessionSecret({ ADMIN_PASSWORD: "new one" }), token, now)).toBeNull();
    // a forged role
    const [v, , sig] = token.split(".");
    const forged = `${v}.${Buffer.from(JSON.stringify({ user: "admin", role: "owner", exp: 9e9 })).toString("base64url")}.${sig}`;
    expect(await readSessionToken(secret, forged, now)).toBeNull();
    expect(await readSessionToken(secret, "garbage", now)).toBeNull();
  });

  it("roles: a content user never sees orders or customers", () => {
    const content = { user: "seo", role: "content" as const, exp: 0 };
    expect(can(content, "content")).toBe(true);
    expect(can(content, "orders")).toBe(false);
    expect(can(content, "customers")).toBe(false);
    expect(can({ ...content, role: "owner" }, "orders")).toBe(true);
    expect(can(null, "orders")).toBe(false);
  });

  it("the sales team signs in with SALES_PASSWORD and sees only home, orders, customers, leads and coupons", async () => {
    const both = { ...env, SALES_PASSWORD: "sales pass" };
    expect(await passwordRole("correct horse battery", both)).toEqual({ user: "admin", role: "owner" });
    expect(await passwordRole("sales pass", both)).toEqual({ user: "sales", role: "sales" });
    expect(await passwordRole("sales pass", env)).toBeNull();
    expect(await passwordRole("wrong", both)).toBeNull();
    // the admin locked: not the sales team either
    expect(await passwordRole("sales pass", { SALES_PASSWORD: "sales pass" })).toBeNull();
    // the same password for both: the owner
    expect(await passwordRole("x", { ADMIN_PASSWORD: "x", SALES_PASSWORD: "x" })).toEqual({ user: "admin", role: "owner" });

    const sales = { user: "sales", role: "sales" as const, exp: 0 };
    expect(ALL_PERMISSIONS.filter((p) => can(sales, p))).toEqual(["orders", "customers", "leads", "delete_leads", "coupons"]);
    expect(homeFor(sales)).toBe("/admin/");
    expect(can({ ...sales, role: "owner" }, "stats")).toBe(true);
  });

  it("a sales cookie needs SALES_PASSWORD, and ends when it changes, while the owner stays signed in", async () => {
    const both = { ...env, SALES_PASSWORD: "sales pass" };
    const secret = sessionSecret(both)!;
    const now = Date.UTC(2026, 10, 9);
    const sales = await createSessionToken(secret, "sales", "sales", now, both);
    const owner = await createSessionToken(secret, "admin", "owner", now, both);
    expect(await readSessionToken(secret, sales, now, both)).toMatchObject({ user: "sales", role: "sales" });
    const changed = { ...env, SALES_PASSWORD: "new sales pass" };
    expect(await readSessionToken(secret, sales, now, changed)).toBeNull();
    expect(await readSessionToken(secret, sales, now, env)).toBeNull();
    expect(await readSessionToken(secret, owner, now, changed)).toMatchObject({ role: "owner" });
    // a sales cookie turned into an owner's
    const [v, , sig] = sales.split(".");
    const forged = `${v}.${Buffer.from(JSON.stringify({ user: "sales", role: "owner", exp: 9e9 })).toString("base64url")}.${sig}`;
    expect(await readSessionToken(secret, forged, now, both)).toBeNull();
    await expect(createSessionToken(secret, "sales", "sales", now, env)).rejects.toThrow();
  });

  it("goes back only to an admin page after signing in", () => {
    expect(safeNext("/admin/orders/123/")).toBe("/admin/orders/123/");
    expect(safeNext("https://evil.test/admin")).toBe("/admin/");
    expect(safeNext("//evil.test")).toBe("/admin/");
    expect(safeNext("/admin//evil")).toBe("/admin/");
    expect(safeNext("/admin/login/")).toBe("/admin/");
  });
});

describe("status rules", () => {
  it("only a payment leaves 'waiting for payment'", () => {
    expect(allowedMoves("pending_payment", false)).toEqual(["cancelled"]);
    expect(canTransition("cancelled", "new", false)).toBe(false);
    expect(canTransition("cancelled", "new", true)).toBe(true);
    expect(allowedMoves("refunded", true)).toEqual([]);
    expect(canTransition("completed", "refunded", true)).toBe(false);
    expect(canTransition("scheduled", "cancelled", true)).toBe(true);
    expect(allowedMoves("new", true)).toEqual(["cancelled"]);
    expect(allowedMoves("cancelled", true)).toEqual(["new"]);
    expect(STATUS_LABEL.scheduled).toBe("חדשה");
    expect(STATUS_LABEL.refunded).toBe("בוטלה");
    expect(canTransition("new", "new", true)).toBe(false);
  });
});

describe("helpers", () => {
  it("Israel's day starts at 22:00 or 21:00 UTC", () => {
    expect(israelDayStart("2026-11-04").toISOString()).toBe("2026-11-03T22:00:00.000Z");
    expect(israelDayStart("2026-07-01").toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(israelDate(new Date("2026-11-03T22:30:00Z"))).toBe("2026-11-04");
  });

  it("CSV cells", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("+972")).toBe("'+972");
    expect(csvCell(null)).toBe("");
  });

  it("email needs a key and a recipient", () => {
    expect(emailConfig({})).toBeNull();
    expect(emailConfig({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(emailConfig({ RESEND_API_KEY: "re_x", ORDER_EMAIL_TO: "a@b.co, c@d.co" })).toEqual({ apiKey: "re_x", to: ["a@b.co", "c@d.co"], from: "Modubox <onboarding@resend.dev>" });
  });
});

describe("database address", async () => {
  const { databaseUrl } = await import("../src/db");
  it("reads Neon's names, with the DATABASE prefix too", () => {
    expect(databaseUrl({ DATABASE_URL: " postgres://a " })).toBe("postgres://a");
    expect(databaseUrl({ DATABASE_POSTGRES_URL: "postgres://b" })).toBe("postgres://b");
    expect(databaseUrl({ POSTGRES_URL: "postgres://c" })).toBe("postgres://c");
    expect(databaseUrl({})).toBe("");
  });
});
