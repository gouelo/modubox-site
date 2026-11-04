CREATE TABLE "deleted_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text DEFAULT 'admin' NOT NULL,
	"customer_name" text,
	"total" integer,
	"status" text,
	"paid" boolean DEFAULT false NOT NULL
);
