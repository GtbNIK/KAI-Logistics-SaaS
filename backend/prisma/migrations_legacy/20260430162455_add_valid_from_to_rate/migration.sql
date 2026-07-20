-- AlterTable
ALTER TABLE "Rate" ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Rate_validFrom_idx" ON "Rate"("validFrom");
