CREATE TYPE "public"."AdminType" AS ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER');--> statement-breakpoint
CREATE TYPE "public"."DeviceType" AS ENUM('INVERTER', 'ANALYZER', 'RELAY');--> statement-breakpoint
CREATE TYPE "public"."PermissionLevel" AS ENUM('READ', 'WRITE', 'FULL');--> statement-breakpoint
CREATE TYPE "public"."PlantType" AS ENUM('SOLAR', 'WIND', 'HYDRO');--> statement-breakpoint
CREATE TYPE "public"."ProtocolType" AS ENUM('MODBUS', 'IEC104');--> statement-breakpoint
CREATE TABLE "AppUser" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userCode" text NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"adminType" "AdminType" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "AppUser_userCode_unique" UNIQUE("userCode"),
	CONSTRAINT "AppUser_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "AppUserProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"plant_id" uuid,
	"device_id" uuid,
	"permissionLevel" "PermissionLevel" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CompanyProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"representative" text,
	"taxOffice" text,
	"taxNumber" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "CompanyProfile_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "DatasheetPoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"dataName" text NOT NULL,
	"dataValue" text,
	"registerAddress" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"functionCode" integer,
	"multiplier" real,
	"wordSwap" boolean DEFAULT false,
	"feederName" text,
	"signalType" text,
	"signalDescription" text,
	"dataType" text,
	"signalSource" text,
	"componentId" text,
	"componentText" text,
	"ioa1ObjectAddress" integer,
	"ioa2CellNo" integer,
	"ioa3VoltageLevel" integer,
	"scadaAddress" integer
);
--> statement-breakpoint
CREATE TABLE "DatasheetProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"protocolType" "ProtocolType" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_config_id" uuid NOT NULL,
	"deviceName" text NOT NULL,
	"deviceType" "DeviceType" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"datasheet_profile_id" uuid
);
--> statement-breakpoint
CREATE TABLE "IEC104Config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"ipAddress" text NOT NULL,
	"port" integer NOT NULL,
	"asduAddr" integer NOT NULL,
	"t0" integer NOT NULL,
	"t1" integer NOT NULL,
	"t2" integer NOT NULL,
	"t3" integer NOT NULL,
	"k" integer NOT NULL,
	"w" integer NOT NULL,
	CONSTRAINT "IEC104Config_protocol_id_unique" UNIQUE("protocol_id")
);
--> statement-breakpoint
CREATE TABLE "ModbusConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"ipAddress" text NOT NULL,
	"port" integer NOT NULL,
	"slaveId" integer NOT NULL,
	"timeout" integer NOT NULL,
	"retryCount" integer NOT NULL,
	CONSTRAINT "ModbusConfig_protocol_id_unique" UNIQUE("protocol_id")
);
--> statement-breakpoint
CREATE TABLE "Plant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"plantName" text NOT NULL,
	"plantType" "PlantType" NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProtocolConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"protocolType" "ProtocolType" NOT NULL,
	"configName" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TelemetryValue" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "TelemetryValue_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"device_id" uuid NOT NULL,
	"pointId" uuid NOT NULL,
	"measurementTime" timestamp with time zone NOT NULL,
	"valueNumeric" double precision,
	"quality" smallint,
	"rawPayload" text
);
--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_user_id_AppUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."AppUser"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_company_id_CompanyProfile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."CompanyProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_plant_id_Plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."Plant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_device_id_Device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD CONSTRAINT "DatasheetPoint_profile_id_DatasheetProfile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."DatasheetProfile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Device" ADD CONSTRAINT "Device_protocol_config_id_ProtocolConfig_id_fk" FOREIGN KEY ("protocol_config_id") REFERENCES "public"."ProtocolConfig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Device" ADD CONSTRAINT "Device_datasheet_profile_id_DatasheetProfile_id_fk" FOREIGN KEY ("datasheet_profile_id") REFERENCES "public"."DatasheetProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IEC104Config" ADD CONSTRAINT "IEC104Config_protocol_id_ProtocolConfig_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."ProtocolConfig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ModbusConfig" ADD CONSTRAINT "ModbusConfig_protocol_id_ProtocolConfig_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."ProtocolConfig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_company_id_CompanyProfile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."CompanyProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProtocolConfig" ADD CONSTRAINT "ProtocolConfig_plant_id_Plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."Plant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_device_id_Device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_pointId_DatasheetPoint_id_fk" FOREIGN KEY ("pointId") REFERENCES "public"."DatasheetPoint"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "AppUser_userCode_idx" ON "AppUser" USING btree ("userCode");--> statement-breakpoint
CREATE INDEX "AppUser_email_idx" ON "AppUser" USING btree ("email");--> statement-breakpoint
CREATE INDEX "AppUserProfile_user_id_idx" ON "AppUserProfile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "AppUserProfile_company_id_idx" ON "AppUserProfile" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "AppUserProfile_plant_id_idx" ON "AppUserProfile" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "AppUserProfile_device_id_idx" ON "AppUserProfile" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "CompanyProfile_name_idx" ON "CompanyProfile" USING btree ("name");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_profile_id_idx" ON "DatasheetPoint" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_dataName_idx" ON "DatasheetPoint" USING btree ("dataName");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_registerAddress_idx" ON "DatasheetPoint" USING btree ("registerAddress");--> statement-breakpoint
CREATE INDEX "Device_protocol_config_id_idx" ON "Device" USING btree ("protocol_config_id");--> statement-breakpoint
CREATE INDEX "Device_deviceName_idx" ON "Device" USING btree ("deviceName");--> statement-breakpoint
CREATE INDEX "IEC104Config_ipAddress_idx" ON "IEC104Config" USING btree ("ipAddress");--> statement-breakpoint
CREATE INDEX "ModbusConfig_ipAddress_idx" ON "ModbusConfig" USING btree ("ipAddress");--> statement-breakpoint
CREATE INDEX "Plant_company_id_idx" ON "Plant" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ProtocolConfig_plant_id_idx" ON "ProtocolConfig" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "TelemetryValue_pointId_measurementTime_idx" ON "TelemetryValue" USING btree ("pointId","measurementTime");--> statement-breakpoint
CREATE INDEX "TelemetryValue_device_id_measurementTime_idx" ON "TelemetryValue" USING btree ("device_id","measurementTime");--> statement-breakpoint
CREATE INDEX "TelemetryValue_measurementTime_idx" ON "TelemetryValue" USING btree ("measurementTime");