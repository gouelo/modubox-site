-- Leads deleted in the admin (round 17) stay in the table, out of every list and count;
-- the AI questions' view leaves them out too.
ALTER TABLE "leads" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deleted_by" text;--> statement-breakpoint
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
FROM "public"."leads" l
WHERE l.deleted_at IS NULL;
