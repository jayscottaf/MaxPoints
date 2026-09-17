ALTER TABLE "UserCard" ADD COLUMN "expirationDate" TIMESTAMP(3);
-- statement-break
UPDATE "UserCard" SET "expirationDate" = "renewalDate", "renewalDate" = NULL;
