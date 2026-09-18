-- AlterTable
ALTER TABLE "Payable" ADD COLUMN     "lengthCm" DECIMAL(10,2),
ADD COLUMN     "widthCm" DECIMAL(10,2),
ADD COLUMN     "heightCm" DECIMAL(10,2),
ADD COLUMN     "cbm" DECIMAL(10,3),
ADD COLUMN     "weightKg" DECIMAL(10,2);
