import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Get the sheets
    const cardsSheet = workbook.Sheets['Cards']
    const perksSheet = workbook.Sheets['Perks']

    if (!cardsSheet || !perksSheet) {
      return NextResponse.json({
        error: 'Excel file must have "Cards" and "Perks" sheets'
      }, { status: 400 })
    }

    // Convert sheets to JSON
    const cardsData = XLSX.utils.sheet_to_json(cardsSheet)
    const perksData = XLSX.utils.sheet_to_json(perksSheet)

    // Import cards
    const importedCards: any[] = []
    for (const row of cardsData) {
      const cardName = (row as any)['Card']
      const annualFee = parseFloat((row as any)['Annual Fee (USD)']) || 0
      const renewalDate = (row as any)['Renewal Date (enter)']

      if (!cardName) continue

      // Map Excel card names to our card IDs
      let cardId = cardName.toLowerCase().replace(/\s+/g, '-')
      if (cardName === 'Amex Platinum') cardId = 'amex-platinum'
      if (cardName === 'Amex Hilton Aspire') cardId = 'amex-hilton-aspire'
      if (cardName === 'Chase Sapphire Reserve') cardId = 'chase-reserve'

      // Check if card exists, update or create
      const card = await prisma.card.upsert({
        where: { id: cardId },
        update: { annualFee },
        create: {
          id: cardId,
          name: cardName,
          issuer: cardName.includes('Amex') ? 'American Express' : 'Chase',
          annualFee
        }
      })

      // Associate with user
      const userId = 'user-default' // In production, get from session
      await prisma.userCard.upsert({
        where: {
          userId_cardId: {
            userId,
            cardId: card.id
          }
        },
        update: {
          renewalDate: renewalDate ? new Date(renewalDate) : null
        },
        create: {
          userId,
          cardId: card.id,
          renewalDate: renewalDate ? new Date(renewalDate) : null
        }
      })

      importedCards.push(card)
    }

    // Import perks with usage data
    let importedPerks = 0
    let importedUsage = 0

    for (const row of perksData) {
      const cardName = (row as any)['Card']
      const perkName = (row as any)['Perk / Credit']
      const maxValue = parseFloat((row as any)['Max Value (USD)']) || 0
      const amountUsed = parseFloat((row as any)['Amount Used (USD)']) || 0
      const periodType = (row as any)['Period Type']?.toLowerCase() || 'annual'
      const enrollmentRequired = (row as any)['Requires Enrollment?'] === 'Yes'
      const notes = (row as any)['Notes'] || ''

      if (!cardName || !perkName) continue

      // Map to card ID
      let cardId = cardName.toLowerCase().replace(/\s+/g, '-')
      if (cardName === 'Amex Platinum') cardId = 'amex-platinum'
      if (cardName === 'Amex Hilton Aspire') cardId = 'amex-hilton-aspire'
      if (cardName === 'Chase Sapphire Reserve') cardId = 'chase-reserve'

      // Check if card exists
      const card = await prisma.card.findUnique({
        where: { id: cardId }
      })

      if (!card) continue

      // Create or update perk
      const perkId = `${cardId}-${perkName.toLowerCase().replace(/\s+/g, '-')}`

      const perk = await prisma.perk.upsert({
        where: { id: perkId },
        update: {
          maxValue,
          periodType,
          enrollmentRequired,
          notes
        },
        create: {
          id: perkId,
          cardId: card.id,
          name: perkName,
          maxValue,
          periodType,
          enrollmentRequired,
          notes,
          description: (row as any)['Period Notes'] || null
        }
      })

      importedPerks++

      // Import usage data if present
      if (amountUsed > 0) {
        const userId = 'user-default'
        await prisma.usage.create({
          data: {
            userId,
            perkId: perk.id,
            amount: amountUsed,
            notes: 'Imported from Excel'
          }
        })
        importedUsage++
      }
    }

    return NextResponse.json({
      success: true,
      imported: {
        cards: importedCards.length,
        perks: importedPerks,
        usage: importedUsage
      }
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Failed to import Excel file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}