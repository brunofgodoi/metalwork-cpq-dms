-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'PENDING_APPROVAL';

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approver_id" TEXT,
    "justification" TEXT NOT NULL,
    "marginProposed" DECIMAL(5,2) NOT NULL,
    "marginMin" DECIMAL(5,2) NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_quote_id_idx" ON "approval_requests"("quote_id");

-- CreateIndex
CREATE INDEX "approval_requests_requested_by_id_idx" ON "approval_requests"("requested_by_id");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
