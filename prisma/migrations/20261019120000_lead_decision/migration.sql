-- The team approves or rejects each Seller registration (separate from the contact status), with a history.
-- CreateEnum
CREATE TYPE "LeadDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "decision" "LeadDecision" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "LeadDecisionChange" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "fromDecision" "LeadDecision" NOT NULL,
    "toDecision" "LeadDecision" NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadDecisionChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadDecisionChange_leadId_createdAt_idx" ON "LeadDecisionChange"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadDecisionChange" ADD CONSTRAINT "LeadDecisionChange_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDecisionChange" ADD CONSTRAINT "LeadDecisionChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
