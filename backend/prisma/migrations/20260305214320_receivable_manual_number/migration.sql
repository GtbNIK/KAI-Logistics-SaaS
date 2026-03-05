/*
  Warnings:

  - A unique constraint covering the columns `[number]` on the table `Receivable` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Receivable" DROP CONSTRAINT "Receivable_paymentNoticeId_fkey";

-- AlterTable
ALTER TABLE "Receivable" ADD COLUMN     "manualNotes" TEXT,
ADD COLUMN     "number" SERIAL NOT NULL,
ALTER COLUMN "paymentNoticeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_number_key" ON "Receivable"("number");

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_paymentNoticeId_fkey" FOREIGN KEY ("paymentNoticeId") REFERENCES "PaymentNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
