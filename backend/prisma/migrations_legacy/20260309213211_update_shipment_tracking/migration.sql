/*
  Warnings:

  - You are about to alter the column `cbm` on the `Shipment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - A unique constraint covering the columns `[number]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "bookingNumber" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "vendedorId" TEXT,
ALTER COLUMN "cbm" SET DATA TYPE DECIMAL(10,3);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_number_key" ON "Shipment"("number");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
