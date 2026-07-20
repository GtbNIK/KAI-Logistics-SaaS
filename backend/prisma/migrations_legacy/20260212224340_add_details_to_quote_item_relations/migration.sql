/*
  Warnings:

  - You are about to alter the column `quantity` on the `QuoteItem` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "allyId" TEXT,
ADD COLUMN     "destinationPort" TEXT,
ADD COLUMN     "originPort" TEXT,
ADD COLUMN     "zoneId" TEXT,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_allyId_fkey" FOREIGN KEY ("allyId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
