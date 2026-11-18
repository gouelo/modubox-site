import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import { orders } from "../src/db/schema";
import type { AdminSession } from "../src/lib/admin/auth";
import { editCustomer, getOrder, readCustomerDetails } from "../src/lib/orders";
import { testDb } from "./db";

// Correcting the customer's details on an order not yet paid (/admin/orders/[id]).
let db: Db;
let session: AdminSession | null = { user: "admin", role: "owner" } as AdminSession;
vi.mock("@/db", () => ({ getDb: () => db }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/admin/session", () => ({
  requireAdmin: async () => {
    if (!session) throw new Error("NEXT_REDIRECT");
    return session;
  },
}));
const { editCustomerAction } = await import("../src/lib/admin/actions");

const NOW = new Date("2026-11-18T08:00:00Z");

async function order(id: string, paid = false) {
  await db.insert(orders).values({ id, customerName: "דנה כהן", customerPhone: "052-1234567", customerKey: "0521234567", customerEmail: "dana@example.com", city: "חיפה", address: "הרצל 1", total: 100, status: paid ? "new" : "pending_payment", paidAt: paid ? NOW : null, source: "phone", payment: "zcredit_link", paymentLink: "https://pay.example/x" });
}

function form(id: string, fields: Record<string, string>) {
  const f = new FormData();
  f.set("id", id);
  for (const [k, v] of Object.entries({ name: "דנה כהן", phone: "052-1234567", email: "dana@example.com", city: "חיפה", address: "הרצל 1", notes: "", ...fields })) f.set(k, v);
  return f;
}

beforeEach(async () => {
  db = await testDb();
  session = { user: "admin", role: "owner" } as AdminSession;
});

describe("editing an unpaid order's customer", () => {
  it("fixes a mistyped phone given with +972, keeps it local, moves the customer key and logs the change", async () => {
    await order("261118000001");
    const r = await editCustomerAction({}, form("261118000001", { phone: "+972 54-765-4321", address: "הרצל 2" }));
    expect(r).toEqual({ ok: true, message: "הפרטים עודכנו." });
    const full = (await getOrder(db, "261118000001"))!;
    expect(full.order).toMatchObject({ customerPhone: "054-7654321", customerKey: "0547654321", address: "הרצל 2", city: "חיפה", total: 100, paymentLink: "https://pay.example/x" });
    const edit = full.events.find((e) => e.kind === "edit")!;
    expect(edit.actor).toBe("admin");
    expect(edit.text).toContain("טלפון 052-1234567 ← 054-7654321");
    expect(edit.text).toContain("כתובת הרצל 1 ← הרצל 2");
    expect(edit.text).not.toContain("שם");
  });

  it("refuses a paid order and leaves it as it was", async () => {
    await order("261118000002", true);
    const r = await editCustomerAction({}, form("261118000002", { phone: "054-7654321" }));
    expect(r.error).toContain("שולמה");
    const full = (await getOrder(db, "261118000002"))!;
    expect(full.order.customerPhone).toBe("052-1234567");
    expect(full.events.filter((e) => e.kind === "edit")).toHaveLength(0);
  });

  it("checks the details on the server", async () => {
    await order("261118000003");
    expect((await editCustomerAction({}, form("261118000003", { phone: "12345" }))).error).toContain("הטלפון");
    expect((await editCustomerAction({}, form("261118000003", { name: "a" }))).error).toContain("שם");
    expect((await editCustomerAction({}, form("261118000003", { email: "not-an-email" }))).error).toContain("המייל");
    expect((await getOrder(db, "261118000003"))!.order.customerPhone).toBe("052-1234567");
  });

  it("answers not found for an unknown order", async () => {
    expect((await editCustomerAction({}, form("999", {}))).error).toBe("ההזמנה לא נמצאה.");
  });

  it("needs a signed-in admin", async () => {
    await order("261118000004");
    session = null;
    await expect(editCustomerAction({}, form("261118000004", { phone: "054-7654321" }))).rejects.toThrow();
    expect((await getOrder(db, "261118000004"))!.order.customerPhone).toBe("052-1234567");
  });

  it("logs nothing when nothing changed (the same phone, written another way)", async () => {
    await order("261118000005");
    const d = readCustomerDetails({ name: "דנה כהן", phone: "+972521234567", email: "dana@example.com", city: "חיפה", address: "הרצל 1", notes: "" });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(await editCustomer(db, "261118000005", d.details)).toEqual({ ok: true });
    expect((await getOrder(db, "261118000005"))!.events.filter((e) => e.kind === "edit")).toHaveLength(0);
  });
});
