CREATE TABLE "LoginChallenge" (
  email TEXT PRIMARY KEY, "codeHash" TEXT NOT NULL, nonce TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requests INTEGER NOT NULL DEFAULT 0
)
-- statement-break
CREATE TABLE "Session" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"(id), "expiresAt" TIMESTAMP(3) NOT NULL)
-- statement-break
CREATE INDEX "Session_expiresAt_idx" ON "Session" ("expiresAt")
