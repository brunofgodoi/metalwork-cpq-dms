-- CreateTable
CREATE TABLE "quote_audit_logs" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_audit_logs_quote_id_idx" ON "quote_audit_logs"("quote_id");

-- CreateIndex
CREATE INDEX "quote_audit_logs_changed_by_id_idx" ON "quote_audit_logs"("changed_by_id");

-- AddForeignKey
ALTER TABLE "quote_audit_logs" ADD CONSTRAINT "quote_audit_logs_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_audit_logs" ADD CONSTRAINT "quote_audit_logs_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
