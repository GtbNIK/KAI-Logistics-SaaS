-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
