// Curated "how to actually use this" tips, sourced once from The Points Guy,
// Doctor of Credit, NerdWallet, Frequent Miler, and r/churning best-practice
// guides (July 2026). Static by design — no live scraping/LLM calls per email.
// Refresh periodically alongside the benefit data in prisma/seed.ts.

const TIPS: Record<string, Record<string, string>> = {
  'amex-platinum': {
    'Resy Dining Credit':
      'Book via the Resy app (not phone) at Amex-partner restaurants; filter "Amex Offers" in-app. Unused balance does not roll over.',
    'Lululemon Credit':
      'Pay in-store or on lululemon.com directly with the card. Gift cards bought at Lululemon also trigger the credit.',
    'Hotel Credit (FHR/THC)':
      "Book only through Amex Travel's FHR/THC portal (not directly with the hotel) to get the credit plus room upgrades.",
    'Digital Entertainment Credit':
      'Enroll the specific streaming service (Disney+, Hulu, ESPN+, NYT, Peacock, Audible) in the Amex Offers portal first — auto-pay without enrolling will not trigger it.',
    'Uber Cash':
      'Add the card in the Uber app as your Amex Platinum specifically so it auto-loads monthly; also works for Uber Eats.',
    'Uber One Membership':
      "Enroll via the Uber app's Amex Platinum promo (not a generic Uber One signup) so Amex reimburses the membership fee.",
    'CLEAR Plus Credit':
      'Enroll at clearme.com/amex or in-app with the Platinum as the payment method — covers your plan plus one authorized user.',
    'Walmart+ Membership':
      'Sign up or link your existing membership at walmart.com using the card; the credit applies automatically, no separate enrollment step.',
    'Airline Incidental Fee Credit':
      'Pick your airline in the Amex Benefits portal by Jan 31, then only charge incidentals (bags, seat upgrades, lounge passes) — not the ticket itself.',
    'Oura Ring Credit':
      'Buy directly from ouraring.com with the card for an automatic credit; the membership subscription itself does not qualify.',
    'Equinox Credit':
      'Pay your Equinox club membership or Equinox+ subscription directly with the card — corporate-discounted memberships may not qualify.',
    'SoulCycle At-Home Bike Credit':
      'Requires an active Equinox+ subscription first, then purchase the bike directly to trigger this one-time $300 credit.',
    'Global Entry/TSA PreCheck':
      'Pay the Global Entry fee (not just PreCheck) directly with the card — GE includes PreCheck, so it is the better value for the same credit.',
  },
  'amex-hilton-aspire': {
    'Hilton Resort Credit':
      'Book directly with the resort (not a prepaid nonrefundable 3rd-party rate) and pay with the physical card at checkout.',
    'Flight Credit':
      'Use it on a ticket, seat upgrade, or bag fee each quarter — it does not roll over, so even a small add-on beats losing it.',
    'Hilton Dining Credit':
      'Charge on-property restaurant, room service, or bar tabs to the card. Watch posting dates near year-end so charges land before it expires.',
    'Waldorf/Conrad Credit':
      'Book the 2-night minimum stay via the Aspire Card benefit rate on HiltonHonorsAspireCard.com; charges can take 8-12 weeks to post, so do not wait until the last weeks of the half.',
    'CLEAR Plus Credit':
      'Enroll or switch your existing CLEAR membership payment method to the Aspire card via the Amex benefits tile — it will not apply automatically.',
    'Stadium/Arena Concessions Credit':
      'Enroll the card once (limit one card per member) for automatic 10% back on concessions at participating venues — no separate claim needed after that.',
    'Free Night Award':
      'Save it for a high-value Waldorf Astoria/Conrad/Hilton resort with standard-room award availability; it is valid 12 months from issue.',
    'Cell Phone Protection':
      'Pay your full monthly cell phone bill with the card to stay covered, then file promptly if damaged/stolen (up to $800, 2 claims/year, $50 deductible each).',
    'Hilton Honors Diamond Status':
      'Mention your Diamond status at check-in for room upgrades and lounge access; combine with award stays for the 5th-night-free benefit.',
    'National Emerald Club Executive Status':
      'Enroll or link your existing Emerald Club membership via your Amex account, then skip the counter and go to the Executive aisle.',
  },
  'chase-reserve': {
    'Annual Travel Credit':
      'Applies automatically to almost any travel-coded purchase (flights, parking, tolls, transit, Airbnb) — no enrollment or portal needed.',
    'The Edit Hotel Credit':
      "Book 2+ night prepaid stays through Chase Travel's dedicated \"The Edit\" tab specifically — regular Chase Travel bookings do not count.",
    '2026 Hotel Credit (One-Time)':
      'Check the current partner hotel list in the Chase Travel portal before booking — it only applies at select 2026 partner collections.',
    'Dining Credit':
      "Book through the \"Sapphire Reserve Exclusive Tables\" program inside OpenTable's dedicated CSR portal — regular OpenTable reservations do not trigger it.",
    'Entertainment Credit':
      'Redeemable only on StubHub or viagogo purchases — other ticket vendors will not trigger it.',
    'DoorDash DashPass':
      'Activate the DashPass offer manually in your Chase account/app once — it does not apply automatically, but recurs after that.',
    'DoorDash Credits':
      'It splits into a $5/mo restaurant credit and two separate $10/mo grocery/retail credits that do not roll over — place a small qualifying order each month.',
    'Lyft Credit':
      'Link the card as your payment method in the Lyft app so it auto-applies to rides — unused monthly credit does not carry over.',
    'Peloton Credit':
      'Enroll separately through the Chase benefits portal before it applies to Peloton App or equipment membership charges.',
    'Apple TV+ & Music':
      'Activate once via the Chase offers/Apple enrollment link tied to the card; complimentary through June 2027, so re-check enrollment if billed unexpectedly.',
    'Global Entry/TSA PreCheck':
      'Pay the application fee directly with this card for an instant credit — works for Global Entry, TSA PreCheck, or NEXUS, once per 4-year cycle.',
    'Priority Pass Select':
      'Enroll via the Chase-specific Priority Pass link (not a generic signup) for unlimited visits, and add authorized users for companion access.',
    'IHG One Rewards Platinum Elite Status':
      'Link your IHG account number in the Chase card benefits dashboard — status will not post without linking the account first.',
    'Marriott Bonvoy Gold Elite Status':
      'Re-register each card membership year via the Chase benefits portal link — this status does not auto-renew.',
    'Chase Sapphire Lounge Access':
      'Tap your physical card at entry to access Chase’s own lounges (separate from Priority Pass) — no app needed, but note capacity caps at busy locations.',
    '$75K Spend-Tier Perks':
      'Track spend in the Chase app benefits tracker; front-load large annual expenses (rent, taxes) before year-end if you are close to the $75K threshold.',
  },
}

// Strips period-instance suffixes (" Q1"-" Q4", " H1"/" H2", " (One-Time)")
// so quarterly/semi-annual perks share one tip across all their instances.
function normalizePerkName(name: string) {
  return name
    .replace(/\s+(Q[1-4]|H[12])$/, '')
    .replace(/\s+\(One-Time\)$/, '')
    .trim()
}

export function getPerkTip(cardId: string, perkName: string): string | null {
  const cardTips = TIPS[cardId]
  if (!cardTips) return null

  return cardTips[normalizePerkName(perkName)] ?? null
}
