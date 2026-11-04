CREATE TABLE "catalog_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"slug" text PRIMARY KEY NOT NULL,
	"copied_from" text,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
