-- Eliminar columnas legacy no utilizadas en Shipment
-- Nota: Asegúrate de remover referencias en el código/Prisma antes de aplicar.

ALTER TABLE "Shipment"
    DROP COLUMN IF EXISTS "containerType",
    DROP COLUMN IF EXISTS "containerQty",
    DROP COLUMN IF EXISTS "shippingLine";
