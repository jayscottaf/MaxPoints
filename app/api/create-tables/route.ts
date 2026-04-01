import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Starting table creation...')

    // Create extension for UUID generation
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`)

    // Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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

    // Create Card table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Card" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "issuer" TEXT NOT NULL,
        "annualFee" DOUBLE PRECISION NOT NULL,
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
      );
    `)

    // Create UserCard table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserCard" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        "cardId" TEXT NOT NULL,
        "renewalDate" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "UserCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserCard_userId_cardId_key" ON "UserCard"("userId", "cardId");
    `)

    // Create Perk table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Perk" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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
        CONSTRAINT "Perk_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Perk_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `)

    // Create Usage table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Usage" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        "perkId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Usage_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Usage_perkId_fkey" FOREIGN KEY ("perkId") REFERENCES "Perk"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `)

    // Create Deal table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Deal" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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

    // Create Notification table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "metadata" JSONB,
        "sentAt" TIMESTAMP(3),
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `)

    // Verify tables were created
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('User', 'Card', 'Perk', 'UserCard', 'Usage', 'Deal', 'Notification')
      ORDER BY table_name;
    ` as any[]

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully!',
      tablesCreated: tables.map((t: any) => t.table_name),
      nextStep: 'Visit /api/setup to seed the database with cards and perks'
    })

  } catch (error) {
    console.error('Table creation error:', error)
    return NextResponse.json({
      error: 'Failed to create tables',
      details: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check if DATABASE_URL is properly configured in Vercel environment variables'
    }, { status: 500 })
  }
}