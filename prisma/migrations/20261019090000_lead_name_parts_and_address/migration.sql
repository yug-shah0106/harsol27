-- Seller registration asks for the name in parts (first, father's, last) and the address in parts.
ALTER TABLE "Lead" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "pincode" TEXT;
