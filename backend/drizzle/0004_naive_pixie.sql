CREATE TYPE "public"."MeasurementType" AS ENUM('NEUTRAL_VOLTAGE', 'PHASE_VOLTAGE', 'PHASE_CURRENT', 'ACTIVE_POWER', 'TOTAL_ACTIVE_POWER', 'APPARENT_POWER', 'TOTAL_APPARENT_POWER', 'REACTIVE_POWER', 'TOTAL_REACTIVE_POWER', 'POWER_FACTOR', 'FREQUENCY', 'IMPORT_ACTIVE_ENERGY', 'EXPORT_ACTIVE_ENERGY', 'INDUCTIVE_REACTIVE_ENERGY', 'CAPACITIVE_REACTIVE_ENERGY', 'HARMONIC_VOLTAGE', 'HARMONIC_CURRENT', 'FLICKER_SHORT_TIME', 'FLICKER_LONG_TIME');--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD COLUMN "ioa3Voltage_level" integer;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD COLUMN "recordingInterval" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD COLUMN "measurementType" "MeasurementType";--> statement-breakpoint
ALTER TABLE "Plant" ADD COLUMN "ytbsCode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "Plant" ADD COLUMN "canSendYtbs" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" DROP COLUMN "ioa3VoltageLevel";