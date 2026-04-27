-- DropIndex
DROP INDEX "Rate_destinationPortIds_idx";

-- DropIndex
DROP INDEX "Rate_originPortIds_idx";

-- AlterTable
ALTER TABLE "Payable" ADD COLUMN     "invoiceNr" TEXT;

-- AlterTable
ALTER TABLE "Rate" ALTER COLUMN "originPortIds" DROP DEFAULT,
ALTER COLUMN "destinationPortIds" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Rate_originPortIds_idx" ON "Rate"("originPortIds");

-- CreateIndex
CREATE INDEX "Rate_destinationPortIds_idx" ON "Rate"("destinationPortIds");
