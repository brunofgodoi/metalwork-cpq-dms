-- DropIndex
DROP INDEX "standard_drawing_versions_drawing_id_idx";

-- AlterTable
ALTER TABLE "standard_drawing_versions" ADD COLUMN     "docFilePath" TEXT;

-- RenameForeignKey
ALTER TABLE "standard_drawing_versions" RENAME CONSTRAINT "standard_drawing_versions_drawing_id_fkey" TO "standard_drawing_versions_drawingId_fkey";

-- RenameForeignKey
ALTER TABLE "standard_drawings" RENAME CONSTRAINT "standard_drawings_category_id_fkey" TO "standard_drawings_categoryId_fkey";

-- RenameIndex
ALTER INDEX "standard_drawing_versions_drawing_id_version_key" RENAME TO "standard_drawing_versions_drawingId_version_key";

-- RenameIndex
ALTER INDEX "standard_drawings_category_id_idx" RENAME TO "standard_drawings_categoryId_idx";
