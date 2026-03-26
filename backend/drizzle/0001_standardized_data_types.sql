CREATE TYPE "public"."CommunicationAlarmStatus" AS ENUM('ACTIVE', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."DataType" AS ENUM('BYTE', 'WORD', 'DWORD', 'LWORD', 'SINT', 'USINT', 'INT', 'UINT', 'DINT', 'UDINT', 'LINT', 'ULINT', 'FLOAT32', 'DOUBLE64');--> statement-breakpoint
CREATE TABLE "CommunicationAlarm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"status" "CommunicationAlarmStatus" DEFAULT 'ACTIVE' NOT NULL,
	"startTime" timestamp with time zone DEFAULT now() NOT NULL,
	"endTime" timestamp with time zone,
	"lastSeenAt" timestamp with time zone,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "telemetry_value" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "telemetry_value_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"device_id" uuid NOT NULL,
	"point_id" uuid NOT NULL,
	"measurement_time" timestamp with time zone NOT NULL,
	"value_numeric" double precision,
	"quality" smallint,
	"raw_payload" text
);
--> statement-breakpoint
ALTER TABLE "TelemetryValue" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "TelemetryValue" CASCADE;--> statement-breakpoint
DROP INDEX "DatasheetPoint_dataName_idx";--> statement-breakpoint
DROP INDEX "DatasheetPoint_registerAddress_idx";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ALTER COLUMN "dataType" SET DATA TYPE "public"."DataType" USING "dataType"::"public"."DataType";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD COLUMN "data" text NOT NULL;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD COLUMN "dataExplanation" text;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD COLUMN "address" integer;--> statement-breakpoint
ALTER TABLE "CommunicationAlarm" ADD CONSTRAINT "CommunicationAlarm_device_id_Device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_value" ADD CONSTRAINT "telemetry_value_device_id_Device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_value" ADD CONSTRAINT "telemetry_value_point_id_DatasheetPoint_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."DatasheetPoint"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "CommunicationAlarm_device_id_idx" ON "CommunicationAlarm" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "CommunicationAlarm_status_idx" ON "CommunicationAlarm" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tv_point_time_idx" ON "telemetry_value" USING btree ("point_id","measurement_time");--> statement-breakpoint
CREATE INDEX "tv_device_time_idx" ON "telemetry_value" USING btree ("device_id","measurement_time");--> statement-breakpoint
CREATE INDEX "tv_time_idx" ON "telemetry_value" USING btree ("measurement_time");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_data_idx" ON "DatasheetPoint" USING btree ("data");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_address_idx" ON "DatasheetPoint" USING btree ("address");--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "dataName";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "dataValue";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "registerAddress";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "signalDescription";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "componentText";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "ioa1ObjectAddress";--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "scadaAddress";