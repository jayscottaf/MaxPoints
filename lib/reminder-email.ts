import { sumMoney } from './accounting'
import { formatCurrency, formatDateOnly } from './utils'

export type ReminderEmailItem = {
  cardName: string; perkName: string; remainingValue: number; maxValue: number
  currentUsage: number; daysRemaining: number | null; periodEnd: string | null
  tip: string | null; sourceUrl?: string | null; kind: 'expiring' | 'available'
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function safeUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
function deadline(item: ReminderEmailItem) {
  if (item.daysRemaining === null) return 'No fixed expiry'
  if (item.daysRemaining === 0) return 'Ends today'
  return item.daysRemaining === 1 ? '1 day left' : `${item.daysRemaining} days left`
}
function renderBenefit(item: ReminderEmailItem) {
  const source = safeUrl(item.sourceUrl)
  return `<tr><td style="padding:24px 0;border-bottom:1px solid #dde5e1;overflow-wrap:anywhere;word-break:break-word;">
    <p style="margin:0 0 4px;color:#56665e;font-size:13px;line-height:20px;">${escapeHtml(item.cardName)}</p>
    <h3 style="margin:0 0 16px;color:#172f25;font-size:18px;line-height:25px;">${escapeHtml(item.perkName)}</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;"><tr>
      <td width="50%" valign="top" style="padding-right:12px;">
        <p style="margin:0 0 4px;font-size:12px;line-height:18px;color:#56665e;">${item.kind === 'expiring' ? 'Still unused' : 'Available now'}</p>
        <p style="margin:0;color:#236754;font-size:28px;line-height:34px;font-weight:700;">${formatCurrency(item.remainingValue)}</p>
        <p style="margin:4px 0 0;color:#56665e;font-size:12px;line-height:19px;">of ${formatCurrency(item.maxValue)} this period${item.currentUsage > 0 ? `<br>${formatCurrency(item.currentUsage)} already used` : ''}</p>
      </td>
      <td width="50%" valign="top" style="padding-left:12px;border-left:1px solid #dde5e1;">
        <p style="margin:0 0 4px;color:#56665e;font-size:12px;line-height:18px;">${item.periodEnd ? 'Use by' : 'Validity'}</p>
        <p style="margin:0;color:#172f25;font-size:16px;line-height:24px;font-weight:700;">${item.periodEnd ? formatDateOnly(item.periodEnd) : 'No fixed expiry'}</p>
        ${item.periodEnd ? `<p style="margin:5px 0 0;color:${item.kind === 'expiring' ? '#a33c22' : '#236754'};font-size:13px;line-height:20px;font-weight:700;">${deadline(item)}</p>` : ''}
      </td>
    </tr></table>
    ${item.tip ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;"><tr><td style="padding:12px 14px;background:#eff5fb;border-left:3px solid #4576a3;color:#264b6b;font-size:13px;line-height:21px;"><strong>Make it count</strong><br>${escapeHtml(item.tip)}</td></tr></table>` : ''}
    ${source ? `<p style="margin:12px 0 0;font-size:12px;line-height:20px;"><a href="${escapeHtml(source)}" style="color:#236754;text-decoration:underline;">Check eligible purchases and terms</a></p>` : ''}
  </td></tr>`
}

export function renderReminderEmail(items: ReminderEmailItem[], appUrl: string) {
  const url = safeUrl(appUrl) ?? 'https://mxpoints.vercel.app/'
  const expiring = items.filter(item => item.kind === 'expiring').sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity))
  const available = items.filter(item => item.kind === 'available')
  const total = formatCurrency(sumMoney(items.map(item => item.remainingValue)))
  const title = expiring.length && available.length ? 'Your benefits, right on time.' : expiring.length ? 'A little reminder. Real value.' : 'Fresh benefits. Ready for you.'
  const subject = expiring.length && available.length ? `MaxPoints: ${items.length} benefit reminders` : expiring.length ? `MaxPoints: ${total} in benefits ending soon` : `MaxPoints: ${total} in newly available benefits`
  const preview = `${total} across ${items.length} ${items.length === 1 ? 'benefit' : 'benefits'}. ${expiring[0]?.periodEnd ? `Next deadline: ${formatDateOnly(expiring[0].periodEnd)}.` : 'Your new benefit period has started.'}`
  const sections = [{ name: 'Ending soon', items: expiring }, { name: 'Newly available', items: available }].filter(section => section.items.length)
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title>
<style>@media only screen and (max-width:480px){.email-pad{padding-left:20px!important;padding-right:20px!important}.outer-pad{padding:12px 8px!important}}</style></head>
<body style="margin:0;padding:0;background:#f2f5f3;color:#172f25;font-family:Arial,Helvetica,sans-serif;letter-spacing:0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f2f5f3;"><tr><td class="outer-pad" align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;">
<tr><td class="email-pad" style="padding:28px 32px 24px;border-top:4px solid #236754;border-bottom:1px solid #dde5e1;">
  <p style="margin:0 0 24px;color:#236754;font-size:20px;line-height:26px;font-weight:700;">MaxPoints<span style="color:#4576a3;">.</span></p>
  <h1 style="margin:0 0 12px;color:#172f25;font-size:28px;line-height:35px;">${title}</h1>
  <p style="margin:0;color:#56665e;font-size:15px;line-height:24px;">${expiring.length ? 'A few useful dates for the benefits you still have left.' : 'Your next round of benefits is ready when you are.'}</p>
</td></tr>
<tr><td class="email-pad" style="padding:20px 32px;background:#edf4ef;border-bottom:1px solid #dde5e1;">
  <p style="margin:0 0 4px;color:#56665e;font-size:12px;line-height:18px;">${expiring.length && !available.length ? 'Unused value ending soon' : 'Value in this reminder'}</p>
  <p style="margin:0;color:#236754;font-size:32px;line-height:40px;font-weight:700;">${total}</p>
  <p style="margin:4px 0 0;color:#56665e;font-size:13px;line-height:20px;">${items.length} ${items.length === 1 ? 'benefit' : 'benefits'} worth a look</p>
</td></tr>
<tr><td class="email-pad" style="padding:8px 32px 0;">
  ${sections.map(section => `<h2 style="margin:24px 0 0;color:#172f25;font-size:16px;line-height:23px;">${section.name}</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">${section.items.map(renderBenefit).join('')}</table>`).join('')}
</td></tr>
<tr><td class="email-pad" style="padding:28px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#236754" style="border-radius:6px;mso-padding-alt:14px 22px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;border:1px solid #236754;border-radius:6px;color:#ffffff;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;">Open MaxPoints</a></td></tr></table>
  <p style="margin:18px 0 0;color:#56665e;font-size:12px;line-height:20px;">Already used a benefit? Update your usage in MaxPoints. Balances reflect what you have logged, not your card statement.</p>
</td></tr>
<tr><td class="email-pad" style="padding:18px 32px;border-top:1px solid #dde5e1;color:#68766f;font-size:11px;line-height:18px;">Your personal benefits reminder. Manage reminder preferences in MaxPoints Settings. Merchant eligibility and issuer terms apply.</td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`
  const text = [title, `${total} across ${items.length} benefits`, '', ...sections.flatMap(section => [section.name.toUpperCase(), ...section.items.flatMap(item => [
    `${item.perkName} | ${item.cardName}`,
    `${formatCurrency(item.remainingValue)} ${item.kind === 'expiring' ? 'unused' : 'available'} of ${formatCurrency(item.maxValue)} this period; ${formatCurrency(item.currentUsage)} used.`,
    item.periodEnd ? `Use by ${formatDateOnly(item.periodEnd)} (${deadline(item)}).` : 'No fixed expiry.',
    ...(item.tip ? [`Tip: ${item.tip}`] : []),
    ...(safeUrl(item.sourceUrl) ? [`Terms: ${safeUrl(item.sourceUrl)}`] : []), '',
  ])]), `Open MaxPoints: ${url}`, '', 'Balances reflect logged usage, not your card statement. Manage reminder preferences in MaxPoints Settings.'].join('\n')
  return { html, text, preview, subject }
}
