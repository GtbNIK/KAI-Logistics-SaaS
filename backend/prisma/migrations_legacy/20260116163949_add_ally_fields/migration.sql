/*
  Warnings:

  - A unique constraint covering the columns `[internalCode]` on the table `Ally` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rifOrId]` on the table `Ally` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `internalCode` to the `Ally` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rifOrId` to the `Ally` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ally" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "internalCode" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rifOrId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ally_internalCode_key" ON "Ally"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Ally_rifOrId_key" ON "Ally"("rifOrId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");
