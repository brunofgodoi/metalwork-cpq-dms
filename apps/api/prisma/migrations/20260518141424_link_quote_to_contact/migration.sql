-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "contactId" TEXT;

-- CreateIndex
CREATE INDEX "quotes_contactId_idx" ON "quotes"("contactId");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
