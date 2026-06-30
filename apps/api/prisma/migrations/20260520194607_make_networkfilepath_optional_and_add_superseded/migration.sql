-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'SUPERSEDED';

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "cad_file_path" TEXT,
ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quote_number" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "revision" TEXT NOT NULL DEFAULT 'A',
ADD COLUMN     "thumbnail_url" TEXT,
ALTER COLUMN "networkFilePath" DROP NOT NULL;
