ALTER TABLE "company_configs" ADD COLUMN "updatedById" TEXT;

CREATE INDEX IF NOT EXISTS idx_company_configs_updated_by ON "company_configs"("updatedById");
