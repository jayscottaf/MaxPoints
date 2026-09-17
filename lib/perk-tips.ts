// Curated "how to actually use this" tips. Amex Platinum and Chase Sapphire
// Reserve and Aspire tips were reviewed against official issuer terms
// on September 17, 2026. Account-specific eligibility still needs confirmation.
// Static by design — no live scraping/LLM calls per email. Refresh
// periodically alongside the benefit data in prisma/seed.ts.

const TIPS: Record<string, Record<string, string>> = {
  'amex-platinum': {
    'Resy Dining Credit':
      'Enroll first in Amex Benefits, then pay at any U.S. Resy-partner restaurant (dine-in or via the Resy app, either works) — gift cards/merchandise excluded. Unused balance does not roll over.',
    'Lululemon Credit':
      "Pay in-store or on lululemon.com directly with the card. Gift cards are officially excluded from triggering the credit — don't rely on them.",
    'Hotel Credit (FHR/THC)':
      "Book only through Amex Travel's FHR/THC portal (not directly with the hotel) to get the credit plus room upgrades.",
    'Digital Entertainment Credit':
      'Enroll in Amex Benefits first, wait ~24 hrs, then charge Disney+, Hulu, ESPN, Paramount+, Peacock, NYT, WSJ, or YouTube Premium/TV directly.',
    'Uber Cash':
      'Add the card to your Uber/Uber Eats wallet; $15 Uber Cash auto-loads monthly (up to 48 hrs), works for rides and Eats. Toggle Uber Cash on and pay with the Amex.',
    'Uber One Membership':
      'No special enrollment needed — set the Platinum as payment for Uber One and toggle Uber Cash OFF for the membership charge so Amex bills it directly.',
    'CLEAR Plus Credit':
      'Enroll at clearme.com or an airport CLEAR pod with the Platinum as payment. Credit covers Basic + Additional Card Members, capped per year across the account.',
    'Walmart+ Membership':
      'Enroll in the benefit first, then sign up for the monthly (not annual) Walmart+ plan with the card as payment; the credit applies automatically after that.',
    'Airline Incidental Fee Credit':
      'Select one eligible airline before purchase. Initial selection can be made any time; changes are normally allowed in January. Eligible incidental fees only: airfare and upgrades are excluded.',
    'Oura Ring Credit':
      'Enroll in Amex Benefits before buying an eligible ring directly from ouraring.com. Membership subscriptions and accessories do not qualify.',
    'Equinox Credit':
      'Enroll through platinum.equinox.com, then pay eligible Equinox or Equinox+ membership charges directly. Third-party app-store purchases do not qualify.',
    'SoulCycle At-Home Bike Credit':
      'Confirm the current offer in your Amex account before purchase. Membership, merchant and transaction conditions apply.',
    'Global Entry/TSA PreCheck':
      'Pay the Global Entry fee (not just PreCheck) directly with the card — GE includes PreCheck, so it is the better value for the same credit.',
  },
  'amex-hilton-aspire': {
    'Hilton Resort Credit':
      'Use a participating Hilton Resort. Advance Purchase/Non-Refundable rates are excluded, including direct bookings. Charge eligible dining/spa incidentals to your room and pay with Aspire.',
    'Flight Credit':
      'Use for eligible airfare purchased directly from an airline or Amex Travel. Do not rely on baggage fees or upgrades qualifying. No quarterly rollover.',
    'Hilton Dining Credit':
      'No standard $250 Aspire dining allowance is supported by current issuer terms. Check a personal offer before treating this as a credit.',
    'Waldorf/Conrad Credit':
      'Book at least two nights using the Aspire Card Benefit rate. The property applies up to $100 to eligible charges on the hotel bill at checkout, per qualifying booking.',
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
      'Applies automatically to almost any travel-coded purchase (flights, hotels, car rentals, trains, taxis, tolls) — no enrollment or booking site required.',
    'The Edit Hotel Credit':
      'Book 2+ night prepaid stays through Chase Travel\'s dedicated "The Edit" section (chasetravel.com/theedit) specifically — regular Chase Travel bookings do not count.',
    '2026 Hotel Credit (One-Time)':
      'Only applies at select brands: IHG, Montage, Pendry, Omni, Virgin, Minor Hotels, Pan Pacific — confirm the current list in the Chase Travel portal before booking.',
    'Dining Credit':
      'Only counts at restaurants in the "Sapphire Reserve Exclusive Tables" program — link your card via OpenTable and book listed restaurants; regular OpenTable bookings do not qualify.',
    'Entertainment Credit':
      'Redeemable only on StubHub/viagogo — but you must activate the benefit on chase.com\'s benefits hub first; purchases made before activation do not count.',
    'DoorDash DashPass':
      'Activate the eligible DashPass offer by December 31, 2027. Confirm your actual complimentary membership expiry in DoorDash; do not assume indefinite renewal.',
    'DoorDash Credits':
      'Splits into a $5/mo restaurant credit and two separate $10/mo grocery/retail credits, one qualifying order each — none roll over if unused.',
    'Lyft Credit':
      'Link the card as your payment method in the Lyft app so the $10/mo auto-applies to rides — no separate opt-in page, and unused credit does not carry over.',
    'Peloton Credit':
      'Activate through Chase before eligible Peloton membership charges. The $10 monthly statement credit is not an equipment credit; equipment points bonuses are separate.',
    'Apple TV+ & Music':
      "Activate once via the Chase Mobile app's Card Benefits (link your Apple ID); complimentary through 6/22/2027 — enrolling suspends any existing paid Apple subscription.",
    'Global Entry/TSA PreCheck':
      'Pay an eligible application fee directly with the card. Global Entry, TSA PreCheck or NEXUS share one credit per four years; allow issuer processing time.',
    'Priority Pass Select':
      'Check Priority Pass membership and digital-card setup in Chase before travel. Access, guest limits, boarding-pass requirements and capacity restrictions apply.',
    'IHG One Rewards Platinum Elite Status':
      'Link your IHG One Rewards account via chase.com or the Chase Mobile app (enroll at ihg.com first if you don\'t have one) — status is not granted retroactively and can take up to 3 weeks to post.',
    'Marriott Bonvoy Gold Elite Status':
      'This is a limited-time 2026 offer, not a recurring annual window. Register through Chase by September 30, 2026 and check qualifying-stay requirements for extension.',
    'Chase Sapphire Lounge Access':
      'Check the specific lounge access rules in Chase before travel; boarding-pass, membership, guest and capacity restrictions apply.',
    '$75K Spend-Tier Perks':
      'Benefits require $75,000 in qualifying calendar-year spending. Confirm qualification and activation in Chase; no spend-tier credit is assumed available in this tracker.',
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
