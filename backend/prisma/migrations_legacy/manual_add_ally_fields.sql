-- Primero, agregar las columnas como opcionales
ALTER TABLE "Ally" ADD COLUMN IF NOT EXISTS "internalCode" TEXT;
ALTER TABLE "Ally" ADD COLUMN IF NOT EXISTS "rifOrId" TEXT;
ALTER TABLE "Ally" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Ally" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Generar valores temporales únicos para los aliados existentes
UPDATE "Ally" SET "internalCode" = 'ALL-0001', "rifOrId" = 'J-00000001-0' WHERE "internalCode" IS NULL AND id = (SELECT id FROM "Ally" WHERE "internalCode" IS NULL ORDER BY "createdAt" LIMIT 1 OFFSET 0);
UPDATE "Ally" SET "internalCode" = 'ALL-0002', "rifOrId" = 'J-00000002-0' WHERE "internalCode" IS NULL AND id = (SELECT id FROM "Ally" WHERE "internalCode" IS NULL ORDER BY "createdAt" LIMIT 1 OFFSET 0);
UPDATE "Ally" SET "internalCode" = 'ALL-0003', "rifOrId" = 'J-00000003-0' WHERE "internalCode" IS NULL AND id = (SELECT id FROM "Ally" WHERE "internalCode" IS NULL ORDER BY "createdAt" LIMIT 1 OFFSET 0);

-- Ahora hacer las columnas NOT NULL
ALTER TABLE "Ally" ALTER COLUMN "internalCode" SET NOT NULL;
ALTER TABLE "Ally" ALTER COLUMN "rifOrId" SET NOT NULL;

-- Crear índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS "Ally_internalCode_key" ON "Ally"("internalCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Ally_rifOrId_key" ON "Ally"("rifOrId");
