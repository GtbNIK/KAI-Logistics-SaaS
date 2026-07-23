-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "pMax" DECIMAL(10,2),
ADD COLUMN     "pVol" DECIMAL(10,2),
ADD COLUMN     "tracking" TEXT,
ADD COLUMN     "value" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT;
