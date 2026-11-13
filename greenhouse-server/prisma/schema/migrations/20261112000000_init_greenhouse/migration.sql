-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ActuatorType" AS ENUM ('PUMP', 'GROW_LIGHT', 'BUZZER');

-- CreateEnum
CREATE TYPE "ControlMode" AS ENUM ('AUTO', 'ON', 'OFF');

-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('AUTO', 'MANUAL', 'SAFETY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('SENSOR', 'PUMP', 'GROW_LIGHT', 'BUZZER', 'DEVICE', 'SETTINGS', 'ALERT', 'AUTH', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('HIGH_TEMPERATURE', 'DEVICE_OFFLINE', 'SENSOR_FAULT', 'PUMP_INEFFECTIVE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "need_password_change" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "api_key_prefix" TEXT NOT NULL,
    "firmware_version" TEXT,
    "ip_address" TEXT,
    "rssi" INTEGER,
    "hardware_info" JSONB,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(3),
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_settings" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "soil_dry_threshold" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "soil_wet_target" DOUBLE PRECISION NOT NULL DEFAULT 62,
    "pump_max_run_sec" INTEGER NOT NULL DEFAULT 30,
    "pump_min_interval_min" INTEGER NOT NULL DEFAULT 10,
    "soil_raw_dry" INTEGER NOT NULL DEFAULT 3100,
    "soil_raw_wet" INTEGER NOT NULL DEFAULT 1300,
    "temp_alarm_threshold" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "temp_alarm_hysteresis" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "temp_low_threshold" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "humidity_min" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "humidity_max" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "light_on_threshold" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "light_hysteresis_pct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "grow_light_min_switch_sec" INTEGER NOT NULL DEFAULT 300,
    "grow_light_schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "grow_light_start" TEXT NOT NULL DEFAULT '06:00',
    "grow_light_end" TEXT NOT NULL DEFAULT '22:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "reading_interval_sec" INTEGER NOT NULL DEFAULT 10,
    "offline_after_sec" INTEGER NOT NULL DEFAULT 60,
    "data_retention_days" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "device_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actuator_states" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "actuator" "ActuatorType" NOT NULL,
    "mode" "ControlMode" NOT NULL DEFAULT 'AUTO',
    "desired_on" BOOLEAN NOT NULL DEFAULT false,
    "reported_on" BOOLEAN,
    "manual_until" TIMESTAMPTZ(3),
    "reason" TEXT,
    "last_changed_at" TIMESTAMPTZ(3),
    "last_on_at" TIMESTAMPTZ(3),
    "last_off_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "actuator_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "soil_moisture" DOUBLE PRECISION,
    "soil_raw" INTEGER,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "light_lux" DOUBLE PRECISION,
    "pump_on" BOOLEAN,
    "grow_light_on" BOOLEAN,
    "buzzer_on" BOOLEAN,
    "rssi" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actuator_events" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "actuator" "ActuatorType" NOT NULL,
    "source" "TriggerSource" NOT NULL,
    "reason" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "duration_sec" INTEGER,
    "soil_before" DOUBLE PRECISION,
    "soil_after" DOUBLE PRECISION,
    "end_reason" TEXT,

    CONSTRAINT "actuator_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ(3),
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "source" "LogSource" NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_api_key_hash_key" ON "devices"("api_key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "device_settings_device_id_key" ON "device_settings"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "actuator_states_device_id_actuator_key" ON "actuator_states"("device_id", "actuator");

-- CreateIndex
CREATE INDEX "sensor_readings_device_id_created_at_idx" ON "sensor_readings"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "sensor_readings_created_at_idx" ON "sensor_readings"("created_at");

-- CreateIndex
CREATE INDEX "actuator_events_device_id_actuator_started_at_idx" ON "actuator_events"("device_id", "actuator", "started_at");

-- CreateIndex
CREATE INDEX "actuator_events_started_at_idx" ON "actuator_events"("started_at");

-- CreateIndex
CREATE INDEX "alerts_device_id_status_idx" ON "alerts"("device_id", "status");

-- CreateIndex
CREATE INDEX "alerts_device_id_dedupe_key_status_idx" ON "alerts"("device_id", "dedupe_key", "status");

-- CreateIndex
CREATE INDEX "alerts_opened_at_idx" ON "alerts"("opened_at");

-- CreateIndex
CREATE INDEX "activity_logs_device_id_created_at_idx" ON "activity_logs"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "device_settings" ADD CONSTRAINT "device_settings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuator_states" ADD CONSTRAINT "actuator_states_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuator_events" ADD CONSTRAINT "actuator_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
