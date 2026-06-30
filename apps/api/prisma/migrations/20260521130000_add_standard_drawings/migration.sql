-- CreateTable: standard_drawings
CREATE TABLE "standard_drawings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "categoryId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2),
    "specs" JSONB,
    "thumbnail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standard_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: standard_drawing_versions
CREATE TABLE "standard_drawing_versions" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "changelog" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standard_drawing_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "standard_drawings_code_key" ON "standard_drawings"("code");
CREATE INDEX "standard_drawings_category_id_idx" ON "standard_drawings"("categoryId");
CREATE INDEX "standard_drawings_type_idx" ON "standard_drawings"("type");
CREATE UNIQUE INDEX "standard_drawing_versions_drawing_id_version_key" ON "standard_drawing_versions"("drawingId", "version");
CREATE INDEX "standard_drawing_versions_drawing_id_idx" ON "standard_drawing_versions"("drawingId");

-- AddForeignKey
ALTER TABLE "standard_drawings" ADD CONSTRAINT "standard_drawings_category_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_drawing_versions" ADD CONSTRAINT "standard_drawing_versions_drawing_id_fkey" FOREIGN KEY ("drawingId") REFERENCES "standard_drawings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
