-- CreateTable
CREATE TABLE "BackupRun" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "fileName" TEXT,
    "sizeBytes" BIGINT,
    "offsite" BOOLEAN NOT NULL DEFAULT false,
    "restoreChecked" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceHeartbeat" (
    "name" TEXT NOT NULL,
    "beatAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceHeartbeat_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "BackupRun_ok_finishedAt_idx" ON "BackupRun"("ok", "finishedAt");

