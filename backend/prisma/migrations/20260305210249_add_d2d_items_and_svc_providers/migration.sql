-- AlterTable
ALTER TABLE "DeliveryNoteItem" ADD COLUMN     "d2dItemId" TEXT;

-- CreateTable
CREATE TABLE "D2DItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "D2DItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SvcProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SvcProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "D2DItem_description_key" ON "D2DItem"("description");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProvider_name_key" ON "SvcProvider"("name");

-- AddForeignKey
ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_d2dItemId_fkey" FOREIGN KEY ("d2dItemId") REFERENCES "D2DItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
