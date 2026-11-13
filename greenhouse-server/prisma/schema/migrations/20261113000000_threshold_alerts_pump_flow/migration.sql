-- Threshold alerts: dry soil, humidity outside the healthy band, low temperature
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'SOIL_DRY';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'HUMIDITY_OUT_OF_RANGE';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'LOW_TEMPERATURE';

-- Pump flow rate (litres per minute) used to estimate the water delivered per run
ALTER TABLE "device_settings" ADD COLUMN IF NOT EXISTS "pump_flow_lpm" DOUBLE PRECISION NOT NULL DEFAULT 1.5;
