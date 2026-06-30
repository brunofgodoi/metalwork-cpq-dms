/*
  Warnings:

  - You are about to drop the column `contactName` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `clients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clients" DROP COLUMN "contactName",
DROP COLUMN "contactPhone";

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_contacts_clientId_idx" ON "client_contacts"("clientId");

-- CreateIndex
CREATE INDEX "client_contacts_isActive_idx" ON "client_contacts"("isActive");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
