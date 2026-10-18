CREATE TABLE "BankConnection" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "itemId" TEXT NOT NULL UNIQUE, "institutionId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "environment" TEXT NOT NULL, "encryptedToken" TEXT, "cursor" TEXT,
  "disabledAt" TIMESTAMP(3), "lastSyncedAt" TIMESTAMP(3), "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement-break
CREATE INDEX "BankConnection_userId_idx" ON "BankConnection"("userId");
-- statement-break
CREATE TABLE "BankAccount" (
  "id" TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL REFERENCES "BankConnection"("id"),
  "accountId" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "mask" TEXT,
  "cardId" TEXT REFERENCES "Card"("id")
);
-- statement-break
CREATE INDEX "BankAccount_connectionId_idx" ON "BankAccount"("connectionId");
-- statement-break
CREATE TABLE "BankTransaction" (
  "id" TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL REFERENCES "BankConnection"("id"),
  "accountId" TEXT NOT NULL REFERENCES "BankAccount"("id"), "transactionId" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL, "amountCents" INTEGER NOT NULL, "date" TEXT NOT NULL,
  "pending" BOOLEAN NOT NULL, "removed" BOOLEAN NOT NULL DEFAULT false, "currency" TEXT,
  "status" TEXT NOT NULL DEFAULT 'unmatched', "candidatePerkIds" TEXT[] NOT NULL,
  "usageId" TEXT REFERENCES "Usage"("id"), "updatedAt" TIMESTAMP(3) NOT NULL
);
-- statement-break
CREATE INDEX "BankTransaction_connectionId_status_idx" ON "BankTransaction"("connectionId", "status");
-- statement-break
CREATE TABLE "BankLinkSession" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "encryptedToken" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement-break
CREATE INDEX "BankLinkSession_userId_expiresAt_idx" ON "BankLinkSession"("userId", "expiresAt");
