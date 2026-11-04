CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"text" text,
	"actor" text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"product_slug" text NOT NULL,
	"product_name" text NOT NULL,
	"qty" integer NOT NULL,
	"base_price" integer NOT NULL,
	"unit_total" integer NOT NULL,
	"items_total" integer NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fulfillment" text NOT NULL,
	"fulfillment_label" text NOT NULL,
	"fulfillment_price" integer,
	"fulfillment_total" integer DEFAULT 0 NOT NULL,
	"pay_to_installer" boolean DEFAULT false NOT NULL,
	"design_link" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"locale" text DEFAULT 'he' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_key" text NOT NULL,
	"customer_email" text,
	"city" text,
	"address" text,
	"customer_notes" text,
	"items_total" integer DEFAULT 0 NOT NULL,
	"fulfillment_total" integer DEFAULT 0 NOT NULL,
	"pay_later" integer DEFAULT 0 NOT NULL,
	"coupon_code" text,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"zcredit_session_id" text,
	"paid_at" timestamp with time zone,
	"zcredit_reference" text,
	"approval_number" text,
	"payment_method" integer,
	"card" text,
	"paid_installments" integer,
	"scheduled_for" text,
	"schedule_note" text,
	"notified_at" timestamp with time zone,
	"partial" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events_order_id_idx" ON "order_events" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_paid_at_idx" ON "orders" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_key_idx" ON "orders" USING btree ("customer_key");