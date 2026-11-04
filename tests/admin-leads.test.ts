import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db";
import { leads } from "../src/db/schema";
import { can, type AdminSession } from "../src/lib/admin/auth";
import { addLeadNote, changeLeadStatus, countNewLeads, exportLeads, getLead, leadsCsv, listAdminLeads, readLeadFilters } from "../src/lib/admin/leads";
import { testDb } from "./db";

// The admin's leads tab: filters, a lead's status and notes with their history, the CSV.
let db: Db;
beforeEach(async () => {
  db = await testDb();
  await db.insert(leads).values([
    { kind: "contact", name: "דנה כהן", phone: "052-1234567", email: "dana@example.com", message: "מחסן 2×3 לגינה", page: "/contact/", createdAt: new Date("2026-11-01T10:00:00Z"), attribution: { utm_source: "google", utm_medium: "cpc", utm_campaign: "sheds-nov" } },
    { kind: "product", name: "יוסי לוי", phone: "0549876543", city: "חיפה", product: "מודובוקס 2×2", page: "/shop/modubox-2x2/", createdAt: new Date("2026-11-03T21:30:00Z") },
    { kind: "order", name: "=HYPERLINK(1)", phone: "050-0000000", orderId: "261104123456", createdAt: new Date("2026-11-04T09:00:00Z") },
  ]);
});

const ids = async (p: Record<string, string>) => (await listAdminLeads(db, readLeadFilters(p))).rows.map((l) => l.name);

describe("leads list", () => {
  it("filters by search, status and Israel's dates, newest first", async () => {
    expect(await ids({})).toEqual(["=HYPERLINK(1)", "יוסי לוי", "דנה כהן"]);
    expect(await ids({ q: "חיפה" })).toEqual(["יוסי לוי"]);
    expect(await ids({ q: "0521234567" })).toEqual(["דנה כהן"]);
    expect(await ids({ q: "2×3" })).toEqual(["דנה כהן"]);
    // 21:30 UTC on the 3rd is 23:30 in Israel: still the 3rd
    expect(await ids({ from: "2026-11-04" })).toEqual(["=HYPERLINK(1)"]);
    expect(await ids({ from: "2026-11-02", to: "2026-11-03" })).toEqual(["יוסי לוי"]);
    expect(await ids({ status: "handled" })).toEqual([]);
    expect(readLeadFilters({ status: "bogus", from: "x" })).toMatchObject({ status: "all", from: undefined });
    expect(await countNewLeads(db)).toBe(3);
  });
});

describe("a lead", () => {
  it("changes status any way, adds notes, and keeps both in its history", async () => {
    const [{ id }] = (await listAdminLeads(db, readLeadFilters({ q: "דנה" }))).rows;
    expect(await changeLeadStatus(db, id, "in_progress")).toEqual({ ok: true });
    expect(await changeLeadStatus(db, id, "in_progress")).toEqual({ ok: true });
    expect(await addLeadNote(db, id, "  חוזר אליה ביום ראשון ")).toEqual({ ok: true });
    expect(await addLeadNote(db, id, "  ")).toEqual({ ok: false, error: "invalid" });
    expect(await changeLeadStatus(db, id, "not_relevant")).toEqual({ ok: true });
    expect(await changeLeadStatus(db, id, "new")).toEqual({ ok: true });
    expect(await changeLeadStatus(db, 99999, "handled")).toEqual({ ok: false, error: "not_found" });
    expect(await changeLeadStatus(db, id, "bogus" as never)).toEqual({ ok: false, error: "invalid" });
    const { lead, events } = (await getLead(db, id))!;
    expect(lead).toMatchObject({ status: "new", notes: "חוזר אליה ביום ראשון" });
    expect(events.map((e) => (e.kind === "note" ? `note:${e.text}` : `${e.fromStatus}>${e.toStatus}`))).toEqual(["new>in_progress", "note:חוזר אליה ביום ראשון", "in_progress>not_relevant", "not_relevant>new"]);
    expect(await getLead(db, Number("abc"))).toBeNull();
    await changeLeadStatus(db, id, "handled");
    expect(await ids({ status: "handled" })).toEqual(["דנה כהן"]);
    expect(await countNewLeads(db)).toBe(2);
  });
});

describe("leads CSV", () => {
  it("opens in Excel: BOM, Hebrew headers, UTM columns, formulas defused", async () => {
    const csv = leadsCsv(await exportLeads(db, readLeadFilters({})));
    expect(csv.startsWith("﻿מספר,התקבל,סטטוס,סוג,שם")).toBe(true);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(4);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("google,cpc,sheds-nov");
    expect(csv).toContain("חדש,טופס יצירת קשר,דנה כהן");
  });
});

describe("who sees leads", () => {
  it("owner and manager, never the content role", () => {
    const s = (role: AdminSession["role"]): AdminSession => ({ user: "x", role, exp: 0 });
    expect(can(s("owner"), "leads")).toBe(true);
    expect(can(s("manager"), "leads")).toBe(true);
    expect(can(s("manager"), "site")).toBe(false);
    expect(can(s("content"), "leads")).toBe(false);
    // deleting orders: the owner only
    expect(can(s("owner"), "delete_orders")).toBe(true);
    expect(can(s("manager"), "delete_orders")).toBe(false);
  });
});
