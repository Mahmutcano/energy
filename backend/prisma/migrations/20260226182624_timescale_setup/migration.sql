-- Enable TimescaleDB extension
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Drop existing indexes as they will be recreated or handled by TimescaleDB
DROP INDEX IF EXISTS "TelemetryValue_device_id_idx";
DROP INDEX IF EXISTS "TelemetryValue_pointId_idx";

-- Convert to Hypertable (This requires the table to be empty or carefully migrated)
-- If there's data, we use migrate_data => true
SELECT create_hypertable('"TelemetryValue"', 'measurementTime', if_not_exists => TRUE, migrate_data => TRUE);

-- Add high performance indexing for time-series queries
CREATE INDEX IF NOT EXISTS "TelemetryValue_pointId_time_idx" ON "TelemetryValue"("pointId", "measurementTime" DESC);
CREATE INDEX IF NOT EXISTS "TelemetryValue_device_id_time_idx" ON "TelemetryValue"("device_id", "measurementTime" DESC);
CREATE INDEX IF NOT EXISTS "TelemetryValue_time_idx" ON "TelemetryValue"("measurementTime" DESC);
