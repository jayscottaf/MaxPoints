import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This creates the tables using raw SQL
export async function GET() {
  try {
    // Create tables with raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL,
        "name" TEXT,
        "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
        "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Card" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "issuer" TEXT NOT NULL,
        "annualFee" DOUBLE PRECISION NOT NULL,
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserCard" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "cardId" TEXT NOT NULL,
        "renewalDate" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserCard_userId_cardId_key" ON "UserCard"("userId", "cardId");
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Perk" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "cardId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "maxValue" DOUBLE PRECISION NOT NULL,
        "periodType" TEXT NOT NULL,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "enrollmentRequired" BOOLEAN NOT NULL DEFAULT false,
        "category" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Perk_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Usage" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "perkId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Deal" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "cardIds" TEXT[],
        "expiryDate" TIMESTAMP(3),
        "source" TEXT NOT NULL,
        "sourceUrl" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "metadata" JSONB,
        "sentAt" TIMESTAMP(3),
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      );
    `)

    // Add foreign keys
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserCard_userId_fkey') THEN
          ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserCard_cardId_fkey') THEN
          ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_cardId_fkey"
          FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Perk_cardId_fkey') THEN
          ALTER TABLE "Perk" ADD CONSTRAINT "Perk_cardId_fkey"
          FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Usage_userId_fkey') THEN
          ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Usage_perkId_fkey') THEN
          ALTER TABLE "Usage" ADD CONSTRAINT "Usage_perkId_fkey"
          FOREIGN KEY ("perkId") REFERENCES "Perk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
          ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully! Now visit /api/setup to seed data.'
    })

  } catch (error) {
    console.error('Init DB error:', error)
    return NextResponse.json({
      error: 'Failed to create tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}