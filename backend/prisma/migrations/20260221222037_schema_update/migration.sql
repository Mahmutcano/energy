/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `port` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `powerPlantId` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `protocol` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `slaveId` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the `AlarmLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlarmThreshold` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IOAMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PowerPlant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Telemetry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `deviceName` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceType` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `protocol_config_id` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminType" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('READ', 'WRITE', 'FULL');

-- CreateEnum
CREATE TYPE "PlantType" AS ENUM ('SOLAR', 'WIND', 'HYDRO');

-- CreateEnum
CREATE TYPE "ProtocolType" AS ENUM ('MODBUS', 'IEC104');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('INVERTER', 'ANALYZER', 'RELAY');

-- DropForeignKey
ALTER TABLE "AlarmThreshold" DROP CONSTRAINT "AlarmThreshold_ioaMappingId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_powerPlantId_fkey";

-- DropForeignKey
ALTER TABLE "IOAMapping" DROP CONSTRAINT "IOAMapping_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "PowerPlant" DROP CONSTRAINT "PowerPlant_customerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_customerId_fkey";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "createdAt",
DROP COLUMN "ipAddress",
DROP COLUMN "name",
DROP COLUMN "port",
DROP COLUMN "powerPlantId",
DROP COLUMN "protocol",
DROP COLUMN "slaveId",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "deviceName" TEXT NOT NULL,
ADD COLUMN     "deviceType" "DeviceType" NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "protocol_config_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "AlarmLog";

-- DropTable
DROP TABLE "AlarmThreshold";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "IOAMapping";

-- DropTable
DROP TABLE "PowerPlant";

-- DropTable
DROP TABLE "Telemetry";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Protocol";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "Severity";

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "adminType" "AdminType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "representative" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUserProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plant_id" TEXT,
    "device_id" TEXT,
    "permissionLevel" "PermissionLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppUserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plantName" TEXT NOT NULL,
    "plantType" "PlantType" NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolConfig" (
    "id" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "protocolType" "ProtocolType" NOT NULL,
    "configName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProtocolConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModbusConfig" (
    "id" TEXT NOT NULL,
    "protocol_id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "slaveId" INTEGER NOT NULL,
    "timeout" INTEGER NOT NULL,
    "retryCount" INTEGER NOT NULL,

    CONSTRAINT "ModbusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEC104Config" (
    "id" TEXT NOT NULL,
    "protocol_id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "asduAddr" INTEGER NOT NULL,
    "t0" INTEGER NOT NULL,
    "t1" INTEGER NOT NULL,
    "t2" INTEGER NOT NULL,
    "t3" INTEGER NOT NULL,
    "k" INTEGER NOT NULL,
    "w" INTEGER NOT NULL,

    CONSTRAINT "IEC104Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceDataSheet" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "dataName" TEXT NOT NULL,
    "dataValue" TEXT,
    "registerAddress" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "functionCode" INTEGER,
    "multiplier" DOUBLE PRECISION,
    "wordSwap" BOOLEAN DEFAULT false,
    "feederName" TEXT,
    "signalType" TEXT,
    "signalDescription" TEXT,
    "dataType" TEXT,
    "signalSource" TEXT,
    "componentId" TEXT,
    "componentText" TEXT,
    "ioa1ObjectAddress" INTEGER,
    "ioa2CellNo" INTEGER,
    "ioa3VoltageLevel" INTEGER,
    "scadaAddress" INTEGER,

    CONSTRAINT "DeviceDataSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryValue" (
    "id" BIGSERIAL NOT NULL,
    "dataSheetId" TEXT NOT NULL,
    "measurementTime" TIMESTAMPTZ NOT NULL,
    "valueNumeric" DOUBLE PRECISION,
    "quality" SMALLINT,
    "rawPayload" BYTEA,

    CONSTRAINT "TelemetryValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_userCode_key" ON "AppUser"("userCode");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_userCode_idx" ON "AppUser"("userCode");

-- CreateIndex
CREATE INDEX "AppUser_email_idx" ON "AppUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_name_key" ON "CompanyProfile"("name");

-- CreateIndex
CREATE INDEX "CompanyProfile_name_idx" ON "CompanyProfile"("name");

-- CreateIndex
CREATE INDEX "AppUserProfile_user_id_idx" ON "AppUserProfile"("user_id");

-- CreateIndex
CREATE INDEX "AppUserProfile_company_id_idx" ON "AppUserProfile"("company_id");

-- CreateIndex
CREATE INDEX "AppUserProfile_plant_id_idx" ON "AppUserProfile"("plant_id");

-- CreateIndex
CREATE INDEX "AppUserProfile_device_id_idx" ON "AppUserProfile"("device_id");

-- CreateIndex
CREATE INDEX "Plant_company_id_idx" ON "Plant"("company_id");

-- CreateIndex
CREATE INDEX "ProtocolConfig_plant_id_idx" ON "ProtocolConfig"("plant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModbusConfig_protocol_id_key" ON "ModbusConfig"("protocol_id");

-- CreateIndex
CREATE INDEX "ModbusConfig_ipAddress_idx" ON "ModbusConfig"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "IEC104Config_protocol_id_key" ON "IEC104Config"("protocol_id");

-- CreateIndex
CREATE INDEX "IEC104Config_ipAddress_idx" ON "IEC104Config"("ipAddress");

-- CreateIndex
CREATE INDEX "DeviceDataSheet_device_id_idx" ON "DeviceDataSheet"("device_id");

-- CreateIndex
CREATE INDEX "DeviceDataSheet_dataName_idx" ON "DeviceDataSheet"("dataName");

-- CreateIndex
CREATE INDEX "DeviceDataSheet_registerAddress_idx" ON "DeviceDataSheet"("registerAddress");

-- CreateIndex
CREATE INDEX "TelemetryValue_dataSheetId_idx" ON "TelemetryValue"("dataSheetId");

-- CreateIndex
CREATE INDEX "TelemetryValue_measurementTime_idx" ON "TelemetryValue"("measurementTime");

-- CreateIndex
CREATE INDEX "Device_protocol_config_id_idx" ON "Device"("protocol_config_id");

-- CreateIndex
CREATE INDEX "Device_deviceName_idx" ON "Device"("deviceName");

-- AddForeignKey
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUserProfile" ADD CONSTRAINT "AppUserProfile_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolConfig" ADD CONSTRAINT "ProtocolConfig_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModbusConfig" ADD CONSTRAINT "ModbusConfig_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "ProtocolConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEC104Config" ADD CONSTRAINT "IEC104Config_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "ProtocolConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_protocol_config_id_fkey" FOREIGN KEY ("protocol_config_id") REFERENCES "ProtocolConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceDataSheet" ADD CONSTRAINT "DeviceDataSheet_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_dataSheetId_fkey" FOREIGN KEY ("dataSheetId") REFERENCES "DeviceDataSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
