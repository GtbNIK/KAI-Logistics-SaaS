/*
  Warnings:

  - You are about to drop the column `price` on the `ServiceRate` table. All the data in the column will be lost.
  - Made the column `method` on table `PaymentTransaction` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `costPrice` to the `ServiceRate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salePrice` to the `ServiceRate` table without a default value. This is not possible if the table is not empty.

*/

-- =============================================
-- PASO 1: Agregar nuevos campos en Client
-- =============================================
ALTER TABLE "Client" ADD COLUMN     "clientDetails" TEXT,
ADD COLUMN     "deactivationNote" TEXT;

-- =============================================
-- PASO 2: Hacer método requerido en PaymentTransaction
-- =============================================
-- Primero, actualizar cualquier NULL a un valor por defecto
UPDATE "PaymentTransaction" SET "method" = 'TRANSFERENCIA' WHERE "method" IS NULL;

-- Luego hacer la columna NOT NULL
ALTER TABLE "PaymentTransaction" ALTER COLUMN "method" SET NOT NULL;

-- =============================================
-- PASO 3: Migrar ServiceRate price -> costPrice/salePrice
-- =============================================

-- Agregar nuevos campos de pricing con valor temporal
ALTER TABLE "ServiceRate" 
ADD COLUMN "costPrice" DECIMAL(10,2),
ADD COLUMN "salePrice" DECIMAL(10,2);

-- Migrar datos: copiar price a ambos campos
UPDATE "ServiceRate" 
SET "costPrice" = "price", 
    "salePrice" = "price";

-- Hacer los campos NOT NULL ahora que tienen datos
ALTER TABLE "ServiceRate" 
ALTER COLUMN "costPrice" SET NOT NULL,
ALTER COLUMN "salePrice" SET NOT NULL;

-- Eliminar el campo antiguo price
ALTER TABLE "ServiceRate" DROP COLUMN "price";

-- Agregar campos opcionales para servicios marítimos/aéreos
ALTER TABLE "ServiceRate" 
ADD COLUMN "destinationPort" TEXT,
ADD COLUMN "originPort" TEXT,
ADD COLUMN "shippingLine" TEXT;

-- =============================================
-- PASO 4: Crear tabla PaymentReceipt
-- =============================================
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" SERIAL NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- Índices únicos
CREATE UNIQUE INDEX "PaymentReceipt_receiptNumber_key" ON "PaymentReceipt"("receiptNumber");
CREATE UNIQUE INDEX "PaymentReceipt_paymentTransactionId_key" ON "PaymentReceipt"("paymentTransactionId");

-- Foreign Keys
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
