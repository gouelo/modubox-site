CREATE TABLE "visit_salts" (
	"day" text PRIMARY KEY NOT NULL,
	"salt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"day" text NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text,
	"utm_source" text,
	"utm_medium" text,
	"channel" text,
	"device" text NOT NULL,
	"visitor" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visits_day_idx" ON "visits" USING btree ("day","kind");--> statement-breakpoint
CREATE INDEX "visits_at_idx" ON "visits" USING btree ("at");