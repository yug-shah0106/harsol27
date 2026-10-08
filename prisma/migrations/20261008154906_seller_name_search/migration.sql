-- CreateIndex
CREATE INDEX "Seller_companyName_trgm_idx" ON "Seller" USING GIN ("companyName" gin_trgm_ops);

