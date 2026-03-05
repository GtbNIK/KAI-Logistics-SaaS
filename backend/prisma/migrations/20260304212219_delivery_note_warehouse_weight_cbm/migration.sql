/*
  Warnings:

  - You are about to drop the column `totalPrice` on the `DeliveryNoteItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `DeliveryNoteItem` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryNoteId` on the `PaymentNotice` table. All the data in the column will be lost.
  - Added the required column `warehouseNumber` to the `DeliveryNote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PaymentNotice" DROP CONSTRAINT "PaymentNotice_deliveryNoteId_fkey";

-- DropIndex
DROP INDEX "PaymentNotice_deliveryNoteId_key";

-- AlterTable
ALTER TABLE "DeliveryNote" ADD COLUMN     "warehouseNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DeliveryNoteItem" DROP COLUMN "totalPrice",
DROP COLUMN "unitPrice",
ADD COLUMN     "cbm" DECIMAL(10,3),
ADD COLUMN     "weight" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PaymentNotice" DROP COLUMN "deliveryNoteId";
