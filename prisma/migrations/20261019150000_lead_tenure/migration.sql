-- How many months a Seller registration's fee bought; the subscription runs from the day they registered.
ALTER TABLE "Lead" ADD COLUMN "tenureMonths" INTEGER;

-- Registrations that already paid (a payment screenshot, since 2026-10-17) bought the 15 months on offer then.
UPDATE "Lead" SET "tenureMonths" = 15 WHERE "paymentProofKey" IS NOT NULL;
