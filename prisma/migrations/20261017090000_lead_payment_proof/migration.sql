-- Pre-registration visitors upload a screenshot of their payment. They have no account, so an
-- upload may now have no user.
ALTER TYPE "UploadPurpose" ADD VALUE 'LEAD_PAYMENT';
ALTER TABLE "Upload" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Lead" ADD COLUMN "paymentProofKey" TEXT,
ADD COLUMN "paymentProofName" TEXT;
