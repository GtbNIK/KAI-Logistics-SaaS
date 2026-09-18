/*
  Warnings:

  - You are about to alter the column `cbm` on the `Shipment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "shippingLineId" TEXT,
ALTER COLUMN "cbm" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "ShippingLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingLine_name_key" ON "ShippingLine"("name");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_shippingLineId_fkey" FOREIGN KEY ("shippingLineId") REFERENCES "ShippingLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
