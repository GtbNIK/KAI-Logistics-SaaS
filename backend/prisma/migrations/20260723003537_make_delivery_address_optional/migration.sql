/*
  Warnings:

  - Made the column `rifOrId` on table `Client` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "rifOrId" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "deliveryAddress" DROP NOT NULL,
ALTER COLUMN "referencePoint" DROP NOT NULL;
