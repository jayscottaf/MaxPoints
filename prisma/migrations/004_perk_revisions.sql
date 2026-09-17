CREATE TABLE "PerkRevision" (
  "id" TEXT PRIMARY KEY, "perkId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement-break
CREATE INDEX "PerkRevision_perkId_createdAt_idx" ON "PerkRevision"("perkId", "createdAt");
