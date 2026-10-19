-- Get started: a lead can name several industries (and optional links to the business).

-- The new lead ↔ industry table (Prisma's implicit many-to-many: A = Industry, B = Lead).
CREATE TABLE "_IndustryToLead" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_IndustryToLead_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_IndustryToLead_B_index" ON "_IndustryToLead"("B");
ALTER TABLE "_IndustryToLead" ADD CONSTRAINT "_IndustryToLead_A_fkey" FOREIGN KEY ("A") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_IndustryToLead" ADD CONSTRAINT "_IndustryToLead_B_fkey" FOREIGN KEY ("B") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing lead keeps the industry it had.
INSERT INTO "_IndustryToLead" ("A", "B") SELECT "industryId", "id" FROM "Lead" WHERE "industryId" IS NOT NULL;

ALTER TABLE "Lead" DROP CONSTRAINT "Lead_industryId_fkey";
DROP INDEX "Lead_industryId_idx";
ALTER TABLE "Lead" DROP COLUMN "industryId",
ADD COLUMN     "website" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "mapsLink" TEXT;
