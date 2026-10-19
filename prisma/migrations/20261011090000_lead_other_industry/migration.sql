-- Get started: a visitor whose industry isn't listed chooses "Other" and types it.
ALTER TABLE "Lead" ALTER COLUMN "industryId" DROP NOT NULL;
ALTER TABLE "Lead" ADD COLUMN "industryOther" TEXT;
