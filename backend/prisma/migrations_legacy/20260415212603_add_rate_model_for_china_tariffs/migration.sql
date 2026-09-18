/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `Client` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[number]` on the table `Payable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `balance` to the `Payable` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RateRegion" AS ENUM ('CHINA', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ALARM');

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "Payable" DROP CONSTRAINT "Payable_allyId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_paymentNoticeId_fkey";

-- DropIndex
DROP INDEX "Ally_rifOrId_key";

-- AlterTable
ALTER TABLE "Ally" ALTER COLUMN "contactInfo" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "rifOrId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "assignedToId",
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Payable" ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "svcProviderId" TEXT,
ALTER COLUMN "allyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PaymentNoticeItem" ADD COLUMN     "airLineId" TEXT,
ADD COLUMN     "allyId" TEXT,
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "shippingLineId" TEXT,
ADD COLUMN     "zoneId" TEXT;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "airLineId" TEXT,
ADD COLUMN     "shippingLineId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "airLineId" TEXT,
ADD COLUMN     "whNumber" TEXT,
ALTER COLUMN "paymentNoticeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AirLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "region" "RateRegion" NOT NULL DEFAULT 'CHINA',
    "allyId" TEXT NOT NULL,
    "originPortId" TEXT NOT NULL,
    "destinationPortId" TEXT NOT NULL,
    "cost20ft" DECIMAL(10,2) NOT NULL,
    "cost40ft" DECIMAL(10,2) NOT NULL,
    "bankFee" DECIMAL(10,2) NOT NULL,
    "profitYaho" DECIMAL(10,2) NOT NULL,
    "profitIS" DECIMAL(10,2) NOT NULL,
    "sale20HC" DECIMAL(10,2) NOT NULL,
    "sale40HC" DECIMAL(10,2) NOT NULL,
    "shippingLineId" TEXT,
    "freeDays" INTEGER NOT NULL DEFAULT 21,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayableTransaction" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,

    CONSTRAINT "PayableTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "targetUserId" TEXT,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserClients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserClients_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirLine_name_key" ON "AirLine"("name");

-- CreateIndex
CREATE INDEX "Rate_region_deletedAt_idx" ON "Rate"("region", "deletedAt");

-- CreateIndex
CREATE INDEX "Rate_allyId_idx" ON "Rate"("allyId");

-- CreateIndex
CREATE INDEX "Rate_originPortId_destinationPortId_idx" ON "Rate"("originPortId", "destinationPortId");

-- CreateIndex
CREATE INDEX "Rate_validUntil_idx" ON "Rate"("validUntil");

-- CreateIndex
CREATE INDEX "_UserClients_B_index" ON "_UserClients"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Payable_number_key" ON "Payable"("number");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_originPortId_fkey" FOREIGN KEY ("originPortId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_destinationPortId_fkey" FOREIGN KEY ("destinationPortId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_airLineId_fkey" FOREIGN KEY ("airLineId") REFERENCES "AirLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_airLineId_fkey" FOREIGN KEY ("airLineId") REFERENCES "AirLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_paymentNoticeId_fkey" FOREIGN KEY ("paymentNoticeId") REFERENCES "PaymentNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_airLineId_fkey" FOREIGN KEY ("airLineId") REFERENCES "AirLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_svcProviderId_fkey" FOREIGN KEY ("svcProviderId") REFERENCES "SvcProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableTransaction" ADD CONSTRAINT "PayableTransaction_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserClients" ADD CONSTRAINT "_UserClients_A_fkey" FOREIGN KEY ("A") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserClients" ADD CONSTRAINT "_UserClients_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
