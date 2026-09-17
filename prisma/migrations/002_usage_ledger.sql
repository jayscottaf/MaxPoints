ALTER TABLE "Perk" ADD COLUMN "periodValue" DOUBLE PRECISION,
ADD COLUMN "decemberBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valueKind" TEXT NOT NULL DEFAULT 'credit',
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3);
-- statement-break
ALTER TABLE "Usage" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
-- statement-break
CREATE UNIQUE INDEX "Usage_userId_idempotencyKey_key" ON "Usage"("userId", "idempotencyKey");
-- statement-break
CREATE INDEX "Usage_userId_perkId_date_idx" ON "Usage"("userId", "perkId", "date");
-- statement-break
CREATE INDEX "Perk_cardId_idx" ON "Perk"("cardId");
