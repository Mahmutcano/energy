CREATE TYPE "public"."AdminType" AS ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER');--> statement-breakpoint
CREATE TYPE "public"."CommunicationAlarmStatus" AS ENUM('ACTIVE', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."DataType" AS ENUM('BYTE', 'WORD', 'DWORD', 'LWORD', 'SINT', 'USINT', 'INT', 'UINT', 'DINT', 'UDINT', 'LINT', 'ULINT', 'FLOAT32', 'DOUBLE64');--> statement-breakpoint
CREATE TYPE "public"."DeviceType" AS ENUM('INVERTER', 'ANALYZER', 'RELAY');--> statement-breakpoint
CREATE TYPE "public"."MeasurementType" AS ENUM('NEUTRAL_VOLTAGE', 'PHASE_VOLTAGE', 'PHASE_CURRENT', 'ACTIVE_POWER', 'TOTAL_ACTIVE_POWER', 'APPARENT_POWER', 'TOTAL_APPARENT_POWER', 'REACTIVE_POWER', 'TOTAL_REACTIVE_POWER', 'POWER_FACTOR', 'FREQUENCY', 'IMPORT_ACTIVE_ENERGY', 'EXPORT_ACTIVE_ENERGY', 'INDUCTIVE_REACTIVE_ENERGY', 'CAPACITIVE_REACTIVE_ENERGY', 'HARMONIC_VOLTAGE', 'HARMONIC_CURRENT', 'FLICKER_SHORT_TIME', 'FLICKER_LONG_TIME');--> statement-breakpoint
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid,
	CONSTRAINT "AppUser_userCode_unique" UNIQUE("userCode"),
	CONSTRAINT "AppUser_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "AppUserProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"companyId" uuid NOT NULL,
	"plantId" uuid,
	"deviceId" uuid,
	"permissionLevel" "PermissionLevel" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CommunicationAlarm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deviceId" uuid NOT NULL,
	"status" "CommunicationAlarmStatus" DEFAULT 'ACTIVE' NOT NULL,
	"startTime" timestamp with time zone DEFAULT now() NOT NULL,
	"endTime" timestamp with time zone,
	"lastSeenAt" timestamp with time zone,
	"message" text
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
	"ytbsUsername" text,
	"ytbsPassword" text,
	"ytbsApiKey" text,
	"baglantiAnlasmasiSirketiLisansNo" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid,
	CONSTRAINT "CompanyProfile_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "DatasheetPoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profileId" uuid NOT NULL,
	"dataName" text NOT NULL,
	"dataExplanation" text,
	"address" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"functionCode" integer,
	"multiplier" double precision,
	"wordSwap" boolean DEFAULT false,
	"feederName" text,
	"signalType" text,
	"dataType" "DataType",
	"signalSource" text,
	"componentId" text,
	"unit" text,
	"ioa2CellNo" integer,
	"ioa3VoltageLevel" integer,
	"recordingInterval" integer DEFAULT 1,
	"measurementType" "MeasurementType",
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid
);
--> statement-breakpoint
CREATE TABLE "DatasheetProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"protocolType" "ProtocolType" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid
);
--> statement-breakpoint
CREATE TABLE "Device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocolConfigId" uuid NOT NULL,
	"deviceName" text NOT NULL,
	"deviceType" "DeviceType" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isRecording" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid,
	"datasheetProfileId" uuid
);
--> statement-breakpoint
CREATE TABLE "IEC104Config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocolId" uuid NOT NULL,
	"ipAddress" text NOT NULL,
	"port" integer NOT NULL,
	"asduAddr" integer NOT NULL,
	"t0" integer NOT NULL,
	"t1" integer NOT NULL,
	"t2" integer NOT NULL,
	"t3" integer NOT NULL,
	"k" integer NOT NULL,
	"w" integer NOT NULL,
	CONSTRAINT "IEC104Config_protocolId_unique" UNIQUE("protocolId")
);
--> statement-breakpoint
CREATE TABLE "ModbusConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocolId" uuid NOT NULL,
	"ipAddress" text NOT NULL,
	"port" integer NOT NULL,
	"slaveId" integer NOT NULL,
	"timeout" integer NOT NULL,
	"retryCount" integer NOT NULL,
	CONSTRAINT "ModbusConfig_protocolId_unique" UNIQUE("protocolId")
);
--> statement-breakpoint
CREATE TABLE "Plant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"companyId" uuid NOT NULL,
	"plantName" text NOT NULL,
	"plantType" "PlantType" NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"isActive" boolean DEFAULT true NOT NULL,
	"ytbsCode" text DEFAULT '' NOT NULL,
	"ytbsExternalId" integer,
	"ytbsPlantName" text,
	"canSendYtbs" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid
);
--> statement-breakpoint
CREATE TABLE "ProtocolConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantId" uuid NOT NULL,
	"protocolType" "ProtocolType" NOT NULL,
	"configName" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedBy" uuid
);
--> statement-breakpoint
CREATE TABLE "TelemetryValue" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "TelemetryValue_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"deviceId" uuid NOT NULL,
	"pointId" uuid NOT NULL,
	"measurementTime" timestamp with time zone NOT NULL,
	"valueNumeric" double precision,
	"quality" smallint,
	"rawPayload" text
);
--> statement-breakpoint
CREATE TABLE "YtbsHourlyProduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantId" uuid NOT NULL,
	"externalPlantId" integer NOT NULL,
	"ytbsPlantId" uuid NOT NULL,
	"readingDate" text NOT NULL,
	"readingHour" text NOT NULL,
	"valueMwh" double precision NOT NULL,
	"isSent" boolean DEFAULT false NOT NULL,
	"lastAttemptAt" timestamp with time zone,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "YtbsInstantProduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantId" uuid NOT NULL,
	"externalPlantId" integer NOT NULL,
	"ytbsPlantId" uuid NOT NULL,
	"readingDate" text NOT NULL,
	"readingTime" text NOT NULL,
	"valueMw" double precision NOT NULL,
	"isSent" boolean DEFAULT false NOT NULL,
	"lastAttemptAt" timestamp with time zone,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "YtbsPlant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantId" uuid NOT NULL,
	"ytbsId" integer NOT NULL,
	"license_no" text NOT NULL,
	"plant_name" text NOT NULL,
	"capacity_ac" double precision NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_userId_AppUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_companyId_CompanyProfile_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."CompanyProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_plantId_Plant_id_fk" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_deviceId_Device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CommunicationAlarm" ADD CONSTRAINT "CommunicationAlarm_deviceId_Device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DatasheetPoint" ADD CONSTRAINT "DatasheetPoint_profileId_DatasheetProfile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."DatasheetProfile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Device" ADD CONSTRAINT "Device_protocolConfigId_ProtocolConfig_id_fk" FOREIGN KEY ("protocolConfigId") REFERENCES "public"."ProtocolConfig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Device" ADD CONSTRAINT "Device_datasheetProfileId_DatasheetProfile_id_fk" FOREIGN KEY ("datasheetProfileId") REFERENCES "public"."DatasheetProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IEC104Config" ADD CONSTRAINT "IEC104Config_protocolId_ProtocolConfig_id_fk" FOREIGN KEY ("protocolId") REFERENCES "public"."ProtocolConfig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ModbusConfig" ADD CONSTRAINT "ModbusConfig_protocolId_ProtocolConfig_id_fk" FOREIGN KEY ("protocolId") REFERENCES "public"."ProtocolConfig"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_companyId_CompanyProfile_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."CompanyProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProtocolConfig" ADD CONSTRAINT "ProtocolConfig_plantId_Plant_id_fk" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_deviceId_Device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_pointId_DatasheetPoint_id_fk" FOREIGN KEY ("pointId") REFERENCES "public"."DatasheetPoint"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsHourlyProduction" ADD CONSTRAINT "YtbsHourlyProduction_plantId_Plant_id_fk" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsHourlyProduction" ADD CONSTRAINT "YtbsHourlyProduction_ytbsPlantId_YtbsPlant_id_fk" FOREIGN KEY ("ytbsPlantId") REFERENCES "public"."YtbsPlant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsInstantProduction" ADD CONSTRAINT "YtbsInstantProduction_plantId_Plant_id_fk" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsInstantProduction" ADD CONSTRAINT "YtbsInstantProduction_ytbsPlantId_YtbsPlant_id_fk" FOREIGN KEY ("ytbsPlantId") REFERENCES "public"."YtbsPlant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "YtbsPlant" ADD CONSTRAINT "YtbsPlant_plantId_Plant_id_fk" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "AppUser_userCode_idx" ON "AppUser" USING btree ("userCode");--> statement-breakpoint
CREATE INDEX "AppUser_email_idx" ON "AppUser" USING btree ("email");--> statement-breakpoint
CREATE INDEX "AppUserProfile_user_id_idx" ON "AppUserProfile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AppUserProfile_company_id_idx" ON "AppUserProfile" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "AppUserProfile_plant_id_idx" ON "AppUserProfile" USING btree ("plantId");--> statement-breakpoint
CREATE INDEX "AppUserProfile_device_id_idx" ON "AppUserProfile" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "CommunicationAlarm_device_id_idx" ON "CommunicationAlarm" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "CommunicationAlarm_status_idx" ON "CommunicationAlarm" USING btree ("status");--> statement-breakpoint
CREATE INDEX "CompanyProfile_name_idx" ON "CompanyProfile" USING btree ("name");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_profile_id_idx" ON "DatasheetPoint" USING btree ("profileId");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_data_idx" ON "DatasheetPoint" USING btree ("dataName");--> statement-breakpoint
CREATE INDEX "DatasheetPoint_address_idx" ON "DatasheetPoint" USING btree ("address");--> statement-breakpoint
CREATE INDEX "Device_protocol_config_id_idx" ON "Device" USING btree ("protocolConfigId");--> statement-breakpoint
CREATE INDEX "Device_deviceName_idx" ON "Device" USING btree ("deviceName");--> statement-breakpoint
CREATE INDEX "IEC104Config_ipAddress_idx" ON "IEC104Config" USING btree ("ipAddress");--> statement-breakpoint
CREATE INDEX "ModbusConfig_ipAddress_idx" ON "ModbusConfig" USING btree ("ipAddress");--> statement-breakpoint
CREATE INDEX "Plant_company_id_idx" ON "Plant" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "ProtocolConfig_plant_id_idx" ON "ProtocolConfig" USING btree ("plantId");--> statement-breakpoint
CREATE INDEX "tv_point_time_idx" ON "TelemetryValue" USING btree ("pointId","measurementTime");--> statement-breakpoint
CREATE INDEX "tv_device_time_idx" ON "TelemetryValue" USING btree ("deviceId","measurementTime");--> statement-breakpoint
CREATE INDEX "tv_time_idx" ON "TelemetryValue" USING btree ("measurementTime");--> statement-breakpoint
CREATE INDEX "YtbsHourlyProduction_ytbs_plant_id_idx" ON "YtbsHourlyProduction" USING btree ("ytbsPlantId");--> statement-breakpoint
CREATE INDEX "YtbsHourlyProduction_reading_date_idx" ON "YtbsHourlyProduction" USING btree ("readingDate");--> statement-breakpoint
CREATE INDEX "YtbsHourlyProduction_is_sent_idx" ON "YtbsHourlyProduction" USING btree ("isSent");--> statement-breakpoint
CREATE UNIQUE INDEX "YtbsHourlyProduction_unique_idx" ON "YtbsHourlyProduction" USING btree ("ytbsPlantId","readingDate","readingHour");--> statement-breakpoint
CREATE INDEX "YtbsInstantProduction_ytbs_plant_id_idx" ON "YtbsInstantProduction" USING btree ("ytbsPlantId");--> statement-breakpoint
CREATE INDEX "YtbsInstantProduction_reading_date_idx" ON "YtbsInstantProduction" USING btree ("readingDate");--> statement-breakpoint
CREATE INDEX "YtbsInstantProduction_is_sent_idx" ON "YtbsInstantProduction" USING btree ("isSent");--> statement-breakpoint
CREATE UNIQUE INDEX "YtbsInstantProduction_unique_idx" ON "YtbsInstantProduction" USING btree ("ytbsPlantId","readingDate","readingTime");--> statement-breakpoint
CREATE INDEX "YtbsPlant_plant_id_idx" ON "YtbsPlant" USING btree ("plantId");--> statement-breakpoint
CREATE INDEX "YtbsPlant_ytbs_id_idx" ON "YtbsPlant" USING btree ("ytbsId");