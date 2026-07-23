-- AlterTable
ALTER TABLE "Rate" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Rate_isActive_idx" ON "Rate"("isActive");
