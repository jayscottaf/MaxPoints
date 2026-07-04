// Curated "how to actually use this" tips. Amex Platinum and Chase Sapphire
// Reserve tips are verified against live official card-benefit pages
// (chase.com, americanexpress.com) plus The Points Guy/NerdWallet/Doctor of
// Credit/Upgraded Points (July 2026). Hilton Aspire tips are sourced from
// those trackers but not individually re-verified against Amex's own pages.
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
      'Pick your airline in the Amex Benefits portal by Jan 31, then only charge incidentals (bags, seat upgrades, lounge passes) — not the ticket itself.',
    'Oura Ring Credit':
      'Buy directly from ouraring.com with the card for an automatic credit; the membership subscription itself does not qualify.',
    'Equinox Credit':
      'Pay Equinox club or Equinox+ directly with the card via platinum.equinox.com. Day passes and app-based purchases do not count.',
    'SoulCycle At-Home Bike Credit':
      'Requires committing to a 12-month Equinox+ membership, then buy the bike at equinoxplus.com/amexbikebenefit (not in-store/app) to trigger the one-time $300 credit.',
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
      'Link the card as your default DoorDash/Caviar payment method, then activate once — it recurs automatically after that as long as the account stays active.',
    'DoorDash Credits':
      'Splits into a $5/mo restaurant credit and two separate $10/mo grocery/retail credits, one qualifying order each — none roll over if unused.',
    'Lyft Credit':
      'Link the card as your payment method in the Lyft app so the $10/mo auto-applies to rides — no separate opt-in page, and unused credit does not carry over.',
    'Peloton Credit':
      "Activate once via chase.com or the Chase Mobile app's Benefits section before Peloton App or equipment charges qualify; up to $10/mo through 12/31/27.",
    'Apple TV+ & Music':
      "Activate once via the Chase Mobile app's Card Benefits (link your Apple ID); complimentary through 6/22/2027 — enrolling suspends any existing paid Apple subscription.",
    'Global Entry/TSA PreCheck':
      'Pay the application fee directly with this card for an instant credit — works for Global Entry, TSA PreCheck, or NEXUS, once per 4-year cycle.',
    'Priority Pass Select':
      'Activates automatically on eligible accounts — physical card is mailed and digital card is set up in the Priority Pass or Chase Mobile app. Authorized users get their own membership for companion access.',
    'IHG One Rewards Platinum Elite Status':
      'Link your IHG One Rewards account via chase.com or the Chase Mobile app (enroll at ihg.com first if you don\'t have one) — status is not granted retroactively and can take up to 3 weeks to post.',
    'Marriott Bonvoy Gold Elite Status':
      'Register during the annual promo window (2026: Jul 1–Sep 30) via marriott.chase.com/elite-status — it does not auto-renew, and award/3rd-party bookings don\'t count toward extending it.',
    'Chase Sapphire Lounge Access':
      'Entry requires your Priority Pass card plus a same-day boarding pass (within 3 hrs of departure), not just a tap — PHX Terminal 4 and LGA Reserve Suites require app reservations at capacity.',
    '$75K Spend-Tier Perks':
      'Spending $75K/year unlocks IHG Diamond, Hyatt Explorist, Southwest A-List, a $500 Southwest credit, and a $250 Shops at Chase credit — no dedicated tracker exists yet, so front-load big expenses if close.',
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
