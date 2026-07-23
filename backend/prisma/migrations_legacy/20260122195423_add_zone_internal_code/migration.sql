/*
  Migration: add_zone_internal_code
  Agrega campo internalCode a Zone con valores para registros existentes
*/

-- 1. Agregar columna sin restricción NOT NULL primero
ALTER TABLE "Zone" ADD COLUMN "internalCode" TEXT;

-- 2. Actualizar registros existentes con códigos secuenciales
UPDATE "Zone" SET "internalCode" = 'ZON-' || LPAD(ROW_NUMBER::TEXT, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "name") as row_number
  FROM "Zone"
) AS numbered
WHERE "Zone".id = numbered.id;

-- 3. Ahora aplicar restricción NOT NULL
ALTER TABLE "Zone" ALTER COLUMN "internalCode" SET NOT NULL;

-- 4. Crear índice único
CREATE UNIQUE INDEX "Zone_internalCode_key" ON "Zone"("internalCode");
