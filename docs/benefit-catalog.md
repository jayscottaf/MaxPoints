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
promos; these now have separate entries. Historical combined usage is retained,
not automatically allocated to the new promos.

Usage previously entered as an annual aggregate is preserved and marked for
review, not silently assigned to individual months. Yearly totals retain that
usage. Use the history editor to record accurate dates and amounts. To split an
aggregate, remove it and log the actual dated entries; the removed record remains
recoverable. Membership estimates and insurance coverage are excluded from usable
credit totals. Unverified catalog entries are not represented as freshly verified.

The benefit editor stores personal values, cadence, dates, enrollment requirement,
and notes. Changing terms clears the verification date and retains a revision.

## September 17 Audit

`lib/verified-benefits.ts` applies the latest issuer-wide terms to initial seeds.
`scripts/correct-benefits.ts` previews existing-account corrections; it requires
an explicit `OWNER_USER_ID`. Apply migration `006_benefit_validity.sql`, take a
backup, deploy the matching accounting code, then use `--apply`. The transaction
records before-images and verifies that every usage record is unchanged.
Re-running the versioned correction is idempotent.

Expired and unsupported benefits no longer contribute to available value.
Absolute offer end dates do not recur with calendar periods. Per-booking limits,
four-year application-credit intervals, and account-anniversary periods are
tracked separately. Insurance, status, estimates and conditional per-booking
benefits do not inflate unconditional available cash totals.

Account-specific dates must be confirmed for Chase's travel-credit cycle,
DashPass, Apple Music and the Hilton free-night certificate. DoorDash split
promos require review when historical combined usage exists. The owner's
already-used $156 Apple TV benefit and its actual expiry are preserved.
SoulCycle and optional concessions eligibility remain explicitly unconfirmed.
DoorDash's September 16 announcement is effective October 1: the $5 restaurant
promo ends and a $15 any-order promo begins, alongside two $10 grocery/retail
promos through 2029. Future offers do not appear available early. Targeted
anniversary offers are informational until account eligibility is confirmed.

Sources: [Amex Platinum](https://global.americanexpress.com/card-benefits/terms/platinum),
[Hilton Aspire](https://global.americanexpress.com/card-benefits/terms/hilton-aspire),
[Chase Reserve](https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve),
and [Apple Music pricing](https://www.apple.com/apple-music/).
