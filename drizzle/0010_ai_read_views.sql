-- The tables the admin's AI questions may read (/admin/stats, src/lib/admin/ask.ts),
-- as views in their own schema: no test orders, and no customer's name, phone,
-- email, address or message. The question's SQL runs with search_path = ai_read,
-- in a READ ONLY transaction.
CREATE SCHEMA IF NOT EXISTS "ai_read";
--> statement-breakpoint
CREATE OR REPLACE VIEW "ai_read"."orders" AS
SELECT
	o.id,
	o.created_at,
	(o.created_at AT TIME ZONE 'Asia/Jerusalem')::date AS created_day,
	o.paid_at,
	(o.paid_at AT TIME ZONE 'Asia/Jerusalem')::date AS paid_day,
	CASE WHEN o.status IN ('new', 'confirmed', 'in_production', 'scheduled', 'completed') THEN 'new'
	     WHEN o.status IN ('cancelled', 'refunded') THEN 'cancelled'
	     ELSE o.status END AS status,
	(o.paid_at IS NOT NULL AND o.status IN ('new', 'confirmed', 'in_production', 'scheduled', 'completed')) AS is_sale,
	o.locale,
	o.city,
	o.items_total,
	o.fulfillment_total,
	o.pay_later,
	o.coupon_code,
	o.discount,
	o.total,
	o.installments,
	o.source,
	o.payment,
	o.partial
FROM "public"."orders" o
WHERE o.is_test = false;
--> statement-breakpoint
CREATE OR REPLACE VIEW "ai_read"."order_items" AS
SELECT
	i.id,
	i.order_id,
	i.product_slug,
	i.product_name,
	i.qty,
	i.base_price,
	i.unit_total,
	i.items_total,
	i.fulfillment,
	i.fulfillment_label,
	i.fulfillment_total
FROM "public"."order_items" i
JOIN "public"."orders" o ON o.id = i.order_id
WHERE o.is_test = false;
--> statement-breakpoint
CREATE OR REPLACE VIEW "ai_read"."order_item_addons" AS
SELECT
	i.order_id,
	i.id AS order_item_id,
	i.product_slug,
	a->>'label' AS label,
	COALESCE((a->>'qty')::int, 1) AS qty,
	(a->>'total')::int AS total,
	COALESCE((a->>'gift')::boolean, false) AS gift
FROM "public"."order_items" i
JOIN "public"."orders" o ON o.id = i.order_id
CROSS JOIN LATERAL jsonb_array_elements(i.addons) a
WHERE o.is_test = false;
--> statement-breakpoint
CREATE OR REPLACE VIEW "ai_read"."leads" AS
SELECT
	l.id,
	l.created_at,
	(l.created_at AT TIME ZONE 'Asia/Jerusalem')::date AS created_day,
	l.kind,
	l.locale,
	l.city,
	l.page,
	l.product,
	l.order_id,
	l.status,
	l.attribution->>'utm_source' AS utm_source,
	l.attribution->>'utm_medium' AS utm_medium,
	l.attribution->>'utm_campaign' AS utm_campaign,
	l.attribution->>'referrer' AS referrer,
	(l.attribution ? 'gclid') AS from_google_ads,
	(l.attribution ? 'fbclid') AS from_facebook_ads
FROM "public"."leads" l;
--> statement-breakpoint
CREATE OR REPLACE VIEW "ai_read"."visits" AS
SELECT
	v.at,
	v.day::date AS day,
	v.kind,
	v.path,
	v.referrer_host,
	v.utm_source,
	v.utm_medium,
	v.channel,
	v.device,
	v.visitor
FROM "public"."visits" v;
