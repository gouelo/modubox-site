CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"locale" text DEFAULT 'he' NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"message" text,
	"page" text,
	"product" text,
	"order_id" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emailed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");