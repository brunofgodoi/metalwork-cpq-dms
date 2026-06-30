/*
  Warnings:

  - Added the required column `createdById` to the `quotes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "estimatedHours" INTEGER,
ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
