-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "aliadoId" TEXT,
ADD COLUMN     "arrivalPort" TEXT,
ADD COLUMN     "consolidadoManual" TEXT,
ADD COLUMN     "consolidadoNumber" TEXT,
ADD COLUMN     "consolidadoTransitTime" INTEGER,
ADD COLUMN     "cst" TEXT,
ADD COLUMN     "d2dAliadoId" TEXT,
ADD COLUMN     "d2dEta" TIMESTAMP(3),
ADD COLUMN     "d2dTransitTime" INTEGER,
ADD COLUMN     "deliveryPlace" TEXT,
ADD COLUMN     "transitTime" INTEGER,
ADD COLUMN     "transportType" TEXT;

-- CreateTable
CREATE TABLE "ShipmentContainer" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentContainer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_aliadoId_fkey" FOREIGN KEY ("aliadoId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_d2dAliadoId_fkey" FOREIGN KEY ("d2dAliadoId") REFERENCES "Ally"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentContainer" ADD CONSTRAINT "ShipmentContainer_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
