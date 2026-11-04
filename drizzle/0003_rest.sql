CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_total" integer,
	"until" text,
	"delivery" boolean DEFAULT false NOT NULL,
	"max_uses" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent" boolean;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- orders of the hidden 1 ₪ test product (data/test-product.json, slug test-…) made before is_test existed
UPDATE "orders" SET "is_test" = true WHERE "id" IN (SELECT "order_id" FROM "order_items" WHERE "product_slug" LIKE 'test-%');
