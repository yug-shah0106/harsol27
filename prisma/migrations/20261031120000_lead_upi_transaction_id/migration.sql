-- The UPI transaction ID from the Seller registration form (client, 2026-10-31). Older registrations have none.
ALTER TABLE "Lead" ADD COLUMN "upiTransactionId" TEXT;
