# Benefit Terms

`prisma/catalog.ts` is the initial catalog. `lib/benefit-catalog.ts` contains
versioned corrections shared by initial seeding and the explicit maintenance
script. Existing accounts are never reseeded. Run `scripts/apply-catalog.ts`
for a preview; add `--apply` only after reviewing it and taking a backup.
Corrections match the old value and cadence so they do not overwrite a personal
override. Before-images are retained in `PerkRevision`.

September 16, 2026 cadence checks use the official
[Amex Platinum benefits](https://global.americanexpress.com/card-benefits/view-all/platinum)
and [Chase Reserve benefits](https://www.chase.com/sapphire-cards/personal/reserve).
Digital entertainment, Uber Cash, Walmart+ and DoorDash are monthly; the Platinum
hotel credit is semiannual. Walmart+ nominal totals exclude applicable taxes.
DoorDash's monthly allowance consists of separate restaurant and non-restaurant
promos; the tracker records their combined value, not order eligibility.

Usage previously entered as an annual aggregate is preserved and marked for
review, not silently assigned to individual months. Yearly totals retain that
usage. Use the history editor to record accurate dates and amounts. To split an
aggregate, remove it and log the actual dated entries; the removed record remains
recoverable. Membership estimates and insurance coverage are excluded from usable
credit totals. Unverified catalog entries are not represented as freshly verified.

The benefit editor stores personal values, cadence, dates, enrollment requirement,
and notes. Changing terms clears the verification date and retains a revision.
