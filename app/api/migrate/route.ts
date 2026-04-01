import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Create all tables using Prisma's schema
    // First drop existing tables if any (be careful with this in production!)
    const tables = ['Usage', 'Notification', 'Perk', 'UserCard', 'Deal', 'Card', 'User']

    // Check if tables exist
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'User'
    ` as any[]

    if (tableCheck.length > 0) {
      return NextResponse.json({
        message: 'Tables already exist. Use /api/setup to seed data.',
        tables: tableCheck
      })
    }

    // Create tables based on Prisma schema
    const createStatements = [
      // User table
      `CREATE TABLE "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
        "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )`,

      `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,

      // Card table
      `CREATE TABLE "Card" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "issuer" TEXT NOT NULL,
        "annualFee" DOUBLE PRECISION NOT NULL,
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
      )`,

      // UserCard table
      `CREATE TABLE "UserCard" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "cardId" TEXT NOT NULL,
        "renewalDate" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "UserCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`,

      `CREATE UNIQUE INDEX "UserCard_userId_cardId_key" ON "UserCard"("userId", "cardId")`,

      // Perk table
      `CREATE TABLE "Perk" (
        "id" TEXT NOT NULL,
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
      )`,

      // Usage table
      `CREATE TABLE "Usage" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "perkId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Usage_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Usage_perkId_fkey" FOREIGN KEY ("perkId") REFERENCES "Perk"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`,

      // Deal table
      `CREATE TABLE "Deal" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "cardIds" TEXT[],
        "expiryDate" TIMESTAMP(3),
        "source" TEXT NOT NULL,
        "sourceUrl" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
      )`,

      // Notification table
      `CREATE TABLE "Notification" (
        "id" TEXT NOT NULL,
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
      )`
    ]

    // Execute each statement
    for (const statement of createStatements) {
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log('Executed:', statement.substring(0, 50) + '...')
      } catch (err) {
        console.error('Failed to execute:', statement.substring(0, 50) + '...', err)
      }
    }

    // Verify tables were created
    const verifyTables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('User', 'Card', 'Perk', 'UserCard', 'Usage', 'Deal', 'Notification')
    ` as any[]

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully!',
      tablesCreated: verifyTables.map((t: any) => t.table_name),
      nextStep: 'Now visit /api/setup to seed data'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Failed to create tables',
      details: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check Vercel logs for details'
    }, { status: 500 })
  }
}