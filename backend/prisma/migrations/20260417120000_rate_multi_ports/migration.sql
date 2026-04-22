-- Drop existing foreign keys tied to single port columns
ALTER TABLE "Rate" DROP CONSTRAINT IF EXISTS "Rate_destinationPortId_fkey";
ALTER TABLE "Rate" DROP CONSTRAINT IF EXISTS "Rate_originPortId_fkey";

-- Ensure auxiliary constraints depending on old columns are removed
DROP INDEX IF EXISTS "Rate_originPortId_destinationPortId_idx";

-- Add new columns to support multiple ports and optional country before dropping legacy columns
ALTER TABLE "Rate"
    ADD COLUMN IF NOT EXISTS "countryId" TEXT,
    ADD COLUMN IF NOT EXISTS "originPortIds" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS "destinationPortIds" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ALTER COLUMN "bankFee" DROP NOT NULL,
    ALTER COLUMN "profitYaho" DROP NOT NULL,
    ALTER COLUMN "profitIS" DROP NOT NULL;

-- Migrate existing single-value ports into the new array columns
UPDATE "Rate"
SET
    "originPortIds" = CASE
        WHEN "originPortId" IS NOT NULL THEN ARRAY["originPortId"]
        ELSE '{}'::TEXT[]
    END,
    "destinationPortIds" = CASE
        WHEN "destinationPortId" IS NOT NULL THEN ARRAY["destinationPortId"]
        ELSE '{}'::TEXT[]
    END;

-- Drop legacy columns now that the data lives in the arrays
ALTER TABLE "Rate"
    DROP COLUMN IF EXISTS "originPortId",
    DROP COLUMN IF EXISTS "destinationPortId";

-- Create countries catalog used by OTHER region rates
CREATE TABLE IF NOT EXISTS "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Country_name_key" ON "Country" ("name");

-- Indexes for faster lookups by the new columns
CREATE INDEX IF NOT EXISTS "Rate_countryId_idx" ON "Rate" ("countryId");
CREATE INDEX IF NOT EXISTS "Rate_originPortIds_idx" ON "Rate" USING GIN ("originPortIds");
CREATE INDEX IF NOT EXISTS "Rate_destinationPortIds_idx" ON "Rate" USING GIN ("destinationPortIds");

-- Foreign key linking rates to optional countries
ALTER TABLE "Rate"
    ADD CONSTRAINT "Rate_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
