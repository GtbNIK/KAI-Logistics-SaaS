-- CreateTable
CREATE TABLE "D2DShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "d2dItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "D2DShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "D2DShipmentItem_shipmentId_idx" ON "D2DShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "D2DShipmentItem_d2dItemId_idx" ON "D2DShipmentItem"("d2dItemId");

-- AddForeignKey
ALTER TABLE "D2DShipmentItem" ADD CONSTRAINT "D2DShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DShipmentItem" ADD CONSTRAINT "D2DShipmentItem_d2dItemId_fkey" FOREIGN KEY ("d2dItemId") REFERENCES "D2DItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
