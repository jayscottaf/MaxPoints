// Synthetic preview only: no database access and no email is sent.
import { writeFile } from 'node:fs/promises'
import { renderReminderEmail, type ReminderEmailItem } from '../lib/reminder-email'
import { verifiedTerms } from '../lib/verified-benefits'

const items: ReminderEmailItem[] = [
  { cardName: 'Amex Hilton Aspire', perkName: 'Flight Credit Q3', remainingValue: 50, maxValue: 50, currentUsage: 0, daysRemaining: 12, periodEnd: '2026-09-30', tip: String(verifiedTerms('amex-hilton-aspire', 'Flight Credit Q3')?.description), kind: 'expiring' },
  { cardName: 'Amex Platinum', perkName: 'Resy Dining Credit Q3', remainingValue: 65, maxValue: 100, currentUsage: 35, daysRemaining: 12, periodEnd: '2026-09-30', tip: String(verifiedTerms('amex-platinum', 'Resy Dining Credit Q3')?.description), kind: 'expiring' },
  { cardName: 'Amex Platinum', perkName: 'Lululemon Credit Q3', remainingValue: 75, maxValue: 75, currentUsage: 0, daysRemaining: 12, periodEnd: '2026-09-30', tip: String(verifiedTerms('amex-platinum', 'Lululemon Credit Q3')?.description), kind: 'expiring' },
]
const path = process.argv[2] || '/tmp/maxpoints-reminder-email-preview.html'
writeFile(path, renderReminderEmail(items, 'https://mxpoints.vercel.app').html, { mode: 0o600 })
  .then(() => console.log(`Synthetic email preview: ${path}`))
  .catch(error => { console.error(error); process.exitCode = 1 })
