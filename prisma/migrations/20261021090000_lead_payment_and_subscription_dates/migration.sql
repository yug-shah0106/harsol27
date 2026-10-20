-- A separate payment decision on each Seller registration, with its own history, and subscription dates an
-- admin can set by hand.
CREATE TYPE "LeadDecisionSubject" AS ENUM ('APPROVAL', 'PAYMENT');

ALTER TABLE "LeadDecisionChange" ADD COLUMN "subject" "LeadDecisionSubject" NOT NULL DEFAULT 'APPROVAL';

ALTER TABLE "Lead" ADD COLUMN "payment" "LeadDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "subscriptionFrom" DATE,
ADD COLUMN "subscriptionUntil" DATE;

-- Registrations already approved were approved after checking their payment: keep their subscriptions running.
UPDATE "Lead" SET "payment" = 'APPROVED' WHERE "decision" = 'APPROVED' AND "paymentProofKey" IS NOT NULL;
