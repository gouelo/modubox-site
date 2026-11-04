import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * The store's database (Postgres: Neon from the Vercel Marketplace).
 * Every order is saved when its payment page is created, and the verified
 * Z-Credit callback marks it paid. Customers are not a table: they are the
 * orders grouped by phone number (src/lib/admin/customers.ts).
 *
 * Migrations: edit this file, then `npm run db:generate` writes a new SQL file
 * under drizzle/; every Vercel build with a database runs the new ones
 * (scripts/migrate.mjs). Migrations must only add (tables, nullable columns):
 * preview builds run them on the same database as production.
 *
 * Money is whole shekels, as everywhere on the site.
 */

/** An order's line of work, from "waiting for payment" to completed (src/lib/admin/status.ts). */
export const ORDER_STATUSES = ["pending_payment", "new", "confirmed", "in_production", "scheduled", "completed", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable(
  "orders",
  {
    /** our order number (Z-Credit's UniqueId), e.g. 261104482913 */
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
    locale: text("locale").notNull().default("he"),

    customerName: text("customer_name").notNull(),
    /** as the customer typed it */
    customerPhone: text("customer_phone").notNull(),
    /** digits only, 05…: the customer's key */
    customerKey: text("customer_key").notNull(),
    customerEmail: text("customer_email"),
    city: text("city"),
    address: text("address"),
    customerNotes: text("customer_notes"),

    /** products and add-ons */
    itemsTotal: integer("items_total").notNull().default(0),
    /** delivery and installation charged online */
    fulfillmentTotal: integer("fulfillment_total").notNull().default(0),
    /** delivery and installation paid to the installer on the day */
    payLater: integer("pay_later").notNull().default(0),
    couponCode: text("coupon_code"),
    discount: integer("discount").notNull().default(0),
    /** charged online, after the coupon */
    total: integer("total").notNull(),
    installments: integer("installments").notNull().default(1),

    zcreditSessionId: text("zcredit_session_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Z-Credit's transaction reference (ReferenceNumber) */
    zcreditReference: text("zcredit_reference"),
    approvalNumber: text("approval_number"),
    /** 0 card, 1 3DS, 4 Apple Pay, 6 Google Pay */
    paymentMethod: integer("payment_method"),
    /** brand and last digits, e.g. "Visa 1234" */
    card: text("card"),
    paidInstallments: integer("paid_installments"),

    /** the delivery or installation day (YYYY-MM-DD, Israel) */
    scheduledFor: text("scheduled_for"),
    /** a time window or a note for the crew, e.g. "08:00–12:00" */
    scheduleNote: text("schedule_note"),

    /** when the business was emailed about the paid order */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    /** made from the payment alone (the order wasn't saved at checkout): no cart details */
    partial: boolean("partial").notNull().default(false),
  },
  (t) => [
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_paid_at_idx").on(t.paidAt),
    index("orders_status_idx").on(t.status),
    index("orders_customer_key_idx").on(t.customerKey),
  ],
);

export interface ItemAddon {
  label: string;
  qty: number;
  /** null: price on request */
  unitPrice: number | null;
  total: number | null;
}

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    productSlug: text("product_slug").notNull(),
    productName: text("product_name").notNull(),
    qty: integer("qty").notNull(),
    /** the product's own price, one unit */
    basePrice: integer("base_price").notNull(),
    /** product + add-ons, one unit */
    unitTotal: integer("unit_total").notNull(),
    /** product + add-ons, times qty */
    itemsTotal: integer("items_total").notNull(),
    addons: jsonb("addons").$type<ItemAddon[]>().notNull().default(sql`'[]'::jsonb`),
    /** pickup | delivery | deliveryAndInstallation */
    fulfillment: text("fulfillment").notNull(),
    fulfillmentLabel: text("fulfillment_label").notNull(),
    /** one unit; null: on request */
    fulfillmentPrice: integer("fulfillment_price"),
    fulfillmentTotal: integer("fulfillment_total").notNull().default(0),
    payToInstaller: boolean("pay_to_installer").notNull().default(false),
    /** the 3D configurator design */
    designLink: text("design_link"),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)],
);

/** What happened to an order: created, paid, a status change, a date set, an internal note. */
export const EVENT_KINDS = ["created", "paid", "status", "schedule", "note", "email"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind").$type<EventKind>().notNull(),
    fromStatus: text("from_status").$type<OrderStatus>(),
    toStatus: text("to_status").$type<OrderStatus>(),
    text: text("text"),
    /** "system", "admin", later a user's name */
    actor: text("actor").notNull().default("system"),
  },
  (t) => [index("order_events_order_id_idx").on(t.orderId, t.at)],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
