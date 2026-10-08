-- Trigram matching for product search (trusted extension: the database owner may create it).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- DropIndex
DROP INDEX "ProductPhoto_storageKey_key";

-- AlterTable
ALTER TABLE "ProductPhoto" DROP COLUMN "storageKey",
ADD COLUMN     "status" "PhotoStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN     "uploadKey" TEXT,
ALTER COLUMN "width" DROP NOT NULL,
ALTER COLUMN "height" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Product_description_trgm_idx" ON "Product" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPhoto_uploadKey_key" ON "ProductPhoto"("uploadKey");

