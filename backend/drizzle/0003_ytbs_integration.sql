CREATE TABLE "YtbsHourlyProduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ytbs_plant_id" uuid NOT NULL,
	"reading_date" text NOT NULL,
	"reading_hour" text NOT NULL,
	"value_mwh" double precision NOT NULL,
	"is_sent" boolean DEFAULT false NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "YtbsInstantProduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ytbs_plant_id" uuid NOT NULL,
	"reading_date" text NOT NULL,
	"reading_time" text NOT NULL,
	"value_mw" double precision NOT NULL,
	"is_sent" boolean DEFAULT false NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "YtbsPlant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"ytbs_id" integer NOT NULL,
	"license_no" text NOT NULL,
	"plant_name" text NOT NULL,
	"capacity_ac" double precision NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "YtbsHourlyProduction" ADD CONSTRAINT "YtbsHourlyProduction_ytbs_plant_id_YtbsPlant_id_fk" FOREIGN KEY ("ytbs_plant_id") REFERENCES "public"."YtbsPlant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsInstantProduction" ADD CONSTRAINT "YtbsInstantProduction_ytbs_plant_id_YtbsPlant_id_fk" FOREIGN KEY ("ytbs_plant_id") REFERENCES "public"."YtbsPlant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsPlant" ADD CONSTRAINT "YtbsPlant_plant_id_Plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."Plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "YtbsHourlyProduction_ytbs_plant_id_idx" ON "YtbsHourlyProduction" USING btree ("ytbs_plant_id");--> statement-breakpoint
CREATE INDEX "YtbsHourlyProduction_reading_date_idx" ON "YtbsHourlyProduction" USING btree ("reading_date");--> statement-breakpoint
CREATE INDEX "YtbsHourlyProduction_is_sent_idx" ON "YtbsHourlyProduction" USING btree ("is_sent");--> statement-breakpoint
CREATE INDEX "YtbsInstantProduction_ytbs_plant_id_idx" ON "YtbsInstantProduction" USING btree ("ytbs_plant_id");--> statement-breakpoint
CREATE INDEX "YtbsInstantProduction_reading_date_idx" ON "YtbsInstantProduction" USING btree ("reading_date");--> statement-breakpoint
CREATE INDEX "YtbsInstantProduction_is_sent_idx" ON "YtbsInstantProduction" USING btree ("is_sent");--> statement-breakpoint
CREATE INDEX "YtbsPlant_plant_id_idx" ON "YtbsPlant" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "YtbsPlant_ytbs_id_idx" ON "YtbsPlant" USING btree ("ytbs_id");