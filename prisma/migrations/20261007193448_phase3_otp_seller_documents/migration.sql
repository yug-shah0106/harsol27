-- CreateEnum
CREATE TYPE "SellerDocumentKind" AS ENUM ('GST_CERTIFICATE', 'PAN_CARD', 'BUSINESS_REGISTRATION', 'ADDRESS_PROOF');

-- DropIndex
DROP INDEX "SellerDocument_sellerId_idx";

-- AlterTable
ALTER TABLE "SellerDocument" ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL,
DROP COLUMN "kind",
ADD COLUMN     "kind" "SellerDocumentKind" NOT NULL;

-- AlterTable
ALTER TABLE "SellerStatusChange" ALTER COLUMN "fromStatus" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerDocument_sellerId_kind_key" ON "SellerDocument"("sellerId", "kind");

