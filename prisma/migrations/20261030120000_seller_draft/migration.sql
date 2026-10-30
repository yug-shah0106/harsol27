-- A seller fills in company details and products first, then sends both for approval together.
ALTER TYPE "SellerStatus" ADD VALUE 'DRAFT' BEFORE 'PENDING';

ALTER TABLE "Seller" ADD COLUMN "detailsSavedAt" TIMESTAMP(3);
UPDATE "Seller" SET "detailsSavedAt" = "createdAt";
