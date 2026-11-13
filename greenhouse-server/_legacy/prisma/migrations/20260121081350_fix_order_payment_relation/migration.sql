/*
  Warnings:

  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - Added the required column `status` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cardIssuer" TEXT,
ADD COLUMN     "currencyAmount" DECIMAL(10,2),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "riskLevel" TEXT,
ADD COLUMN     "riskTitle" TEXT,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "storeAmount" DECIMAL(10,2),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);
