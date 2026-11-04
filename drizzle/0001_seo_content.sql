CREATE TABLE "faq_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"q" text NOT NULL,
	"a" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_seo" (
	"path" text PRIMARY KEY NOT NULL,
	"title" text,
	"description" text,
	"og_image" text,
	"canonical" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"key_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"seo_title" text,
	"description" text DEFAULT '' NOT NULL,
	"date" text NOT NULL,
	"updated" text,
	"cover" text,
	"cover_alt" text,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"destination" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"note" text,
	"kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "faq_blocks_path_idx" ON "faq_blocks" USING btree ("path","position");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_source_idx" ON "redirects" USING btree ("source");