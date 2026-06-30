-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_categoryId_fkey";

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "snapshot" JSONB;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
