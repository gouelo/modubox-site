import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

export const ORDER_SOURCES = ["phone", "whatsapp", "other"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

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

    /** where the order came from: null the site's checkout; "phone", "whatsapp" or "other" for one entered in the admin */
    source: text("source").$type<OrderSource>(),
    /** how a manual order is paid: "transfer", "cash", "check", "zcredit_link", "other" (null: online at checkout) */
    payment: text("payment"),
    /** a manual order's Z-Credit payment page, sent to the customer */
    paymentLink: text("payment_link"),
    /** the customer agreed to get marketing messages (the checkout's checkbox); null: not asked (older orders) */
    marketingConsent: boolean("marketing_consent"),
    /** a payment test (the hidden 1 ₪ product): never counted in sales */
    isTest: boolean("is_test").notNull().default(false),
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
  /** the promotion's gift (₪0), e.g. "מתנה: רצפת פרקט WPC – אפור (6 מ"ר)" */
  gift?: boolean;
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

/**
 * Orders deleted in the admin, by id: a late Z-Credit callback for one of them
 * is acknowledged and never makes it again (src/lib/orders.ts recordPayment).
 */
export const deletedOrders = pgTable("deleted_orders", {
  id: text("id").primaryKey(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull().default("admin"),
  /** what it was, for the record */
  customerName: text("customer_name"),
  total: integer("total"),
  status: text("status"),
  paid: boolean("paid").notNull().default(false),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;

/*
 * The SEO and content module (/admin/content). Every table here is an
 * override: with no rows, the site shows exactly what the code and data/
 * give it. A row changes only what it sets (an empty field keeps the default).
 */

/** One page's search and sharing settings, by its address ("/", "/en/shop/", "/product/modubox-3x3/", "/blog/<slug>/"). */
export const pageSeo = pgTable("page_seo", {
  path: text("path").primaryKey(),
  title: text("title"),
  description: text("description"),
  ogImage: text("og_image"),
  /** another address as the page's canonical one */
  canonical: text("canonical"),
  noindex: boolean("noindex").notNull().default(false),
  /** short facts shown on the page and in its JSON-LD, e.g. {label: "מידות", value: "3×3 מ'"} */
  keyFacts: jsonb("key_facts").$type<KeyFact[]>().notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface KeyFact {
  label: string;
  value: string;
}

/** Questions and answers shown at the bottom of a page, with FAQPage JSON-LD. */
export const faqBlocks = pgTable(
  "faq_blocks",
  {
    id: serial("id").primaryKey(),
    path: text("path").notNull(),
    position: integer("position").notNull().default(0),
    q: text("q").notNull(),
    a: text("a").notNull(),
  },
  (t) => [index("faq_blocks_path_idx").on(t.path, t.position)],
);

export const POST_STATUSES = ["published", "draft", "hidden"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** Blog posts. A row with the slug of a file in content/blog replaces that file; "hidden" takes a post off the site. */
export const posts = pgTable("posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  seoTitle: text("seo_title"),
  description: text("description").notNull().default(""),
  /** YYYY-MM-DD */
  date: text("date").notNull(),
  updated: text("updated"),
  cover: text("cover"),
  coverAlt: text("cover_alt"),
  categories: jsonb("categories").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  body: text("body").notNull().default(""),
  status: text("status").$type<PostStatus>().notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 301 redirects. A row with the source of one in data/redirects.json replaces it; enabled=false turns it off. */
export const redirects = pgTable(
  "redirects",
  {
    id: serial("id").primaryKey(),
    /** decoded, no trailing slash: "/product-page/מחסן", "/post/:slug*" */
    source: text("source").notNull(),
    destination: text("destination").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    enabled: boolean("enabled").notNull().default(true),
    note: text("note"),
    kind: text("kind"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("redirects_source_idx").on(t.source)],
);

/** Site-wide settings by key: "business", "llms", "crawlers". */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PageSeo = typeof pageSeo.$inferSelect;
export type FaqBlock = typeof faqBlocks.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type RedirectRow = typeof redirects.$inferSelect;

/*
 * Catalog editing (/admin/catalog). Each row is a change to a product or an
 * add-on in data/ (or a new product), kept as a draft until it is published:
 * the build reads only `published` (scripts/catalog-sync.mjs) and bakes it
 * into the site, so the cart, the pages and the server's checkout pricing all
 * use the same prices. A row's JSON holds only the fields it changes.
 */
export const catalogProducts = pgTable("catalog_products", {
  slug: text("slug").primaryKey(),
  /** a new product: the product it was copied from (it is listed after it) */
  copiedFrom: text("copied_from"),
  draft: jsonb("draft").$type<Record<string, unknown>>().notNull(),
  /** null: never published */
  published: jsonb("published").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const catalogAddons = pgTable("catalog_addons", {
  id: text("id").primaryKey(),
  draft: jsonb("draft").$type<Record<string, unknown>>().notNull(),
  published: jsonb("published").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export type CatalogProductRow = typeof catalogProducts.$inferSelect;
export type CatalogAddonRow = typeof catalogAddons.$inferSelect;

/**
 * Coupon codes (/admin/coupons). A row with the code of one in the
 * MODUBOX_COUPONS env var replaces it (enabled=false turns it off); the env
 * var's other codes keep working, as before the admin had coupons. Read on
 * the server at checkout only, never baked into the site.
 */
export const coupons = pgTable("coupons", {
  /** upper case, as normalizeCode() makes it */
  code: text("code").primaryKey(),
  /** "percent" | "fixed" */
  kind: text("kind").$type<"percent" | "fixed">().notNull(),
  /** percent (1–100) or shekels */
  value: integer("value").notNull(),
  /** order total it needs, in shekels */
  minTotal: integer("min_total"),
  /** last valid day, YYYY-MM-DD, Israel time */
  until: text("until"),
  /** also discounts delivery and installation */
  delivery: boolean("delivery").notNull().default(false),
  /** paid orders it can be used on; null: no limit */
  maxUses: integer("max_uses"),
  enabled: boolean("enabled").notNull().default(true),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CouponRow = typeof coupons.$inferSelect;
/** Where a lead came from: the contact form, a product page, or an order sent without paying online. */
export const LEAD_KINDS = ["contact", "product", "order"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

/** Ad attribution captured from the landing URL (src/lib/attribution.ts). */
export interface LeadAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  /** the first page of the visit, with its query */
  landing?: string;
  /** the site the visitor came from */
  referrer?: string;
}

/**
 * Every lead from the site's forms (POST /api/lead): the contact form, and an
 * order sent without online payment. The business is emailed about each one
 * (src/lib/leads.ts); /admin/leads lists them. `status` and `notes` are for the admin.
 */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind").$type<LeadKind>().notNull(),
    locale: text("locale").notNull().default("he"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    city: text("city"),
    message: text("message"),
    /** the page the form was sent from, e.g. /contact/ */
    page: text("page"),
    product: text("product"),
    /** an order without online payment: its number */
    orderId: text("order_id"),
    attribution: jsonb("attribution").$type<LeadAttribution>().notNull().default(sql`'{}'::jsonb`),
    /** when the business was emailed about it; null: not (yet) */
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    /** for the admin's leads tab: "new" until someone handles it (LEAD_STATUSES) */
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    /** the latest internal note (never shown to the customer); every note is in lead_events */
    notes: text("notes"),
  },
  (t) => [index("leads_created_at_idx").on(t.createdAt)],
);

export type Lead = typeof leads.$inferSelect;

/** Where the admin is with a lead (src/lib/admin/leads.ts). */
export const LEAD_STATUSES = ["new", "in_progress", "handled", "not_relevant"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** A lead's history in the admin: status changes and internal notes. */
export const leadEvents = pgTable(
  "lead_events",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind").$type<"status" | "note">().notNull(),
    fromStatus: text("from_status").$type<LeadStatus>(),
    toStatus: text("to_status").$type<LeadStatus>(),
    text: text("text"),
    /** "admin", later a user's name */
    actor: text("actor").notNull().default("admin"),
  },
  (t) => [index("lead_events_lead_id_idx").on(t.leadId, t.at)],
);

export type LeadEvent = typeof leadEvents.$inferSelect;
