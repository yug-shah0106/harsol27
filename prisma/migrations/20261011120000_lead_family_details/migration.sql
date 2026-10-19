-- Get started now also asks for father's name, native place, and address or city (empty for older leads).
ALTER TABLE "Lead" ADD COLUMN "fatherName" TEXT;
ALTER TABLE "Lead" ADD COLUMN "nativePlace" TEXT;
ALTER TABLE "Lead" ADD COLUMN "address" TEXT;
