-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "clients_isActive_idx" ON "clients"("isActive");

-- CreateIndex
CREATE INDEX "quotes_clientId_idx" ON "quotes"("clientId");

-- CreateIndex
CREATE INDEX "quotes_categoryId_idx" ON "quotes"("categoryId");

-- CreateIndex
CREATE INDEX "quotes_createdById_idx" ON "quotes"("createdById");

-- CreateIndex
CREATE INDEX "quotes_isActive_idx" ON "quotes"("isActive");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
