-- The profiles' colour the customer picked (white/black), on each order line (round 21).
-- Older lines stay null: only black was kept then, as an add-on line.
ALTER TABLE "order_items" ADD COLUMN "profile_color" text;--> statement-breakpoint
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
	i.fulfillment_total,
	i.profile_color
FROM "public"."order_items" i
JOIN "public"."orders" o ON o.id = i.order_id
WHERE o.is_test = false;
