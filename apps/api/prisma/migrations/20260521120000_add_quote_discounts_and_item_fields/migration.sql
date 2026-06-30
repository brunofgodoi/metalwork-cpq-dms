-- Clean up any legacy snake_case columns from previous failed attempts
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "discount_percent";
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "discount_fixed";

-- AlterTable: add discount fields to quotes
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discountFixed" DECIMAL(10,2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AlterTable: migrate quote_items
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "drawing_id" TEXT;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "drawing_version" INTEGER;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "drawing_ref" TEXT;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "details" JSONB;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quote_items" DROP COLUMN IF EXISTS "totalPrice";
ALTER TABLE "quote_items" DROP COLUMN IF EXISTS "cad_file_path";
ALTER TABLE "quote_items" ALTER COLUMN "quantity" SET DEFAULT 1;
ALTER TABLE "quote_items" ALTER COLUMN "unitPrice" SET DEFAULT 0;

-- Add project column with default for existing rows, then make it NOT NULL
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "project" TEXT;
UPDATE "quote_items" SET "project" = '' WHERE "project" IS NULL;
ALTER TABLE "quote_items" ALTER COLUMN "project" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "quote_items_drawing_id_drawing_version_idx" ON "quote_items" ("drawing_id", "drawing_version");
DROP INDEX IF EXISTS "quote_items_isActive_idx";

