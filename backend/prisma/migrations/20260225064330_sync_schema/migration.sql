/*
  Warnings:

  - You are about to drop the column `dataSheetId` on the `TelemetryValue` table. All the data in the column will be lost.
  - You are about to drop the `DeviceDataSheet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `device_id` to the `TelemetryValue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pointId` to the `TelemetryValue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DeviceDataSheet" DROP CONSTRAINT "DeviceDataSheet_device_id_fkey";

-- DropForeignKey
ALTER TABLE "TelemetryValue" DROP CONSTRAINT "TelemetryValue_dataSheetId_fkey";

-- DropIndex
DROP INDEX "TelemetryValue_dataSheetId_idx";

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "taxNumber" INTEGER,
ADD COLUMN     "taxOffice" TEXT;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "datasheet_profile_id" TEXT;

-- AlterTable
ALTER TABLE "TelemetryValue" DROP COLUMN "dataSheetId",
ADD COLUMN     "device_id" TEXT NOT NULL,
ADD COLUMN     "pointId" TEXT NOT NULL;

-- DropTable
DROP TABLE "DeviceDataSheet";

-- CreateTable
CREATE TABLE "DatasheetProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "protocolType" "ProtocolType" NOT NULL,

    CONSTRAINT "DatasheetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasheetPoint" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
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

    CONSTRAINT "DatasheetPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatasheetPoint_profile_id_idx" ON "DatasheetPoint"("profile_id");

-- CreateIndex
CREATE INDEX "DatasheetPoint_dataName_idx" ON "DatasheetPoint"("dataName");

-- CreateIndex
CREATE INDEX "DatasheetPoint_registerAddress_idx" ON "DatasheetPoint"("registerAddress");

-- CreateIndex
CREATE INDEX "TelemetryValue_device_id_idx" ON "TelemetryValue"("device_id");

-- CreateIndex
CREATE INDEX "TelemetryValue_pointId_idx" ON "TelemetryValue"("pointId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_datasheet_profile_id_fkey" FOREIGN KEY ("datasheet_profile_id") REFERENCES "DatasheetProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasheetPoint" ADD CONSTRAINT "DatasheetPoint_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "DatasheetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryValue" ADD CONSTRAINT "TelemetryValue_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "DatasheetPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
