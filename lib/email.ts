import { Resend } from 'resend'
import { formatCurrency, formatDate } from '@/lib/utils'

export type PerkExpirationEmailItem = {
  cardName: string
  perkName: string
  remainingValue: number
  maxValue: number
  currentUsage: number
  daysRemaining: number
  periodEnd: Date
  tip: string | null
}

let resend: Resend | null = null

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }

  return resend
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderRows(items: PerkExpirationEmailItem[]) {
  return items
    .map((item) => {
      const daysLabel = item.daysRemaining === 1 ? '1 day' : `${item.daysRemaining} days`

      const tipRow = item.tip
        ? `
        <tr>
          <td colspan="3" style="padding: 0 12px 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="background: #eff6ff; border-radius: 6px; padding: 8px 10px; color: #1e40af; font-size: 13px;">
              💡 ${escapeHtml(item.tip)}
            </div>
          </td>
        </tr>
      `
        : ''

      return `
        <tr>
          <td style="padding: 12px; ${item.tip ? '' : 'border-bottom: 1px solid #e5e7eb;'}">
            <strong>${escapeHtml(item.perkName)}</strong>
            <div style="color: #6b7280; font-size: 13px;">${escapeHtml(item.cardName)}</div>
          </td>
          <td style="padding: 12px; ${item.tip ? '' : 'border-bottom: 1px solid #e5e7eb;'} white-space: nowrap;">
            ${formatCurrency(item.remainingValue)}
            <div style="color: #6b7280; font-size: 13px;">of ${formatCurrency(item.maxValue)}</div>
          </td>
          <td style="padding: 12px; ${item.tip ? '' : 'border-bottom: 1px solid #e5e7eb;'} white-space: nowrap;">
            ${formatDate(item.periodEnd)}
            <div style="color: #b45309; font-size: 13px;">${daysLabel} left</div>
          </td>
        </tr>
        ${tipRow}
      `
    })
    .join('')
}

export function renderPerkExpirationEmail(items: PerkExpirationEmailItem[], appUrl: string) {
  const preview =
    items.length === 1
      ? `${items[0].perkName} expires in ${items[0].daysRemaining} days`
      : `${items.length} perks are about to expire`

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(preview)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f4f4f5; color: #18181b; font-family: Arial, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preview)}</div>
        <main style="max-width: 680px; margin: 0 auto; padding: 32px 16px;">
          <section style="background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e4e4e7;">
            <h1 style="margin: 0 0 8px; font-size: 24px;">Expiring MaxPoints perks</h1>
            <p style="margin: 0 0 20px; color: #52525b;">
              These perks still have unused value and are nearing their expiration date.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding: 12px; border-bottom: 2px solid #d4d4d8;">Perk</th>
                  <th align="left" style="padding: 12px; border-bottom: 2px solid #d4d4d8;">Unused</th>
                  <th align="left" style="padding: 12px; border-bottom: 2px solid #d4d4d8;">Expires</th>
                </tr>
              </thead>
              <tbody>${renderRows(items)}</tbody>
            </table>
            <p style="margin: 24px 0 0;">
              <a href="${escapeHtml(appUrl)}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
                Open MaxPoints
              </a>
            </p>
          </section>
        </main>
      </body>
    </html>
  `

  const text = [
    'Expiring MaxPoints perks',
    '',
    ...items.flatMap((item) => {
      const daysLabel = item.daysRemaining === 1 ? '1 day' : `${item.daysRemaining} days`
      const line = `${item.cardName} - ${item.perkName}: ${formatCurrency(item.remainingValue)} unused, expires ${formatDate(item.periodEnd)} (${daysLabel} left)`
      return item.tip ? [line, `  Tip: ${item.tip}`] : [line]
    }),
    '',
    `Open MaxPoints: ${appUrl}`,
  ].join('\n')

  return { html, text, preview }
}

export async function sendPerkExpirationEmail({
  to,
  from,
  items,
  appUrl,
}: {
  to: string
  from: string
  items: PerkExpirationEmailItem[]
  appUrl: string
}) {
  const { html, text, preview } = renderPerkExpirationEmail(items, appUrl)
  const subject = items.length === 1 ? preview : `MaxPoints: ${items.length} perks are about to expire`

  const { data, error } = await getResendClient().emails.send({
    from,
    to,
    subject,
    html,
    text,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
