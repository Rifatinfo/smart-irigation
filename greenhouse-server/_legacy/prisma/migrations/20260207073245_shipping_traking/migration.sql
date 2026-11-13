-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('ORDER_CONFIRMED', 'PACKAGE_SHIPPED', 'ARRIVED_AT_LOCAL_SORT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PLACED';
ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';

-- CreateTable
CREATE TABLE "ShipmentTracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "message" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentTracking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShipmentTracking" ADD CONSTRAINT "ShipmentTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
