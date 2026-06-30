-- CreateTable: company_configs
CREATE TABLE "company_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "footer" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_configs_pkey" PRIMARY KEY ("id")
);
