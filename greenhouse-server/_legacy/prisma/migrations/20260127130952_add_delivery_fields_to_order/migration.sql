-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('INSIDE_DHAKA', 'OUTSIDE_DHAKA');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryCharge" DECIMAL(65,30),
ADD COLUMN     "deliveryType" "DeliveryType";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoiceUrl" TEXT;
