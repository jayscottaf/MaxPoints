# Use the remainder

Optional purchase ideas appear inside a collapsed benefit-detail section and in reminder emails for partially used, current benefits. Notification Settings can disable email ideas independently of reminder delivery. No purchases, subscriptions, account changes, or usage entries are made by these links.

The pure policy in `lib/remainder-options.ts` is shared by the app and reminder planner. It uses the current available balance, hides expired/unused/exhausted/uncertain benefits, matches known card and benefit identities, and never invents prices or merchant inventory. Monthly and half-year balances are not transferable to other periods. Existing reminder cadence and send deduplication are unchanged.

Eligibility reviewed October 18, 2026. Ideas automatically stop appearing after January 16, 2027 unless the catalog is reviewed and its dates updated. Review provider eligibility, exclusions and links before extending this window. Account-specific eligibility still applies.

Sources:

- Digital providers and direct monthly billing: https://global.americanexpress.com/card-benefits/detail/digital-entertainment/platinum/
- Resy, lululemon, airline incidentals and Uber One restrictions: https://global.americanexpress.com/card-benefits/terms/platinum
- Exclusive Tables, multiple restaurants in one half-year: https://www.chase.com/personal/credit-cards/education/basics/how-to-use-dining-credit-chase-sapphire-reserve-exclusive-tables
- Included Walmart+ streaming choice and third-party upgrade billing: https://www.walmart.com/help/article/walmart-benefits-streaming-services/35624ec8e133496ab647a398a90cf779

Recorded Walmart+ usage suppresses separate Paramount+ and Peacock purchase ideas and shows an included-plan notice instead. This is conservative: the app does not know which of the two services is selected. It cannot detect all existing direct subscriptions, so every surface includes a reminder to check subscriptions and renewal rates.

Tests: `npm test`, `npm run lint`, `npm run build`. Set `REMAINDER_FIXTURE=1` when running `tests/browser-fixture.ts` after building to inspect an isolated owner with $6.01 entertainment and $52.38 dining balances, without modifying real usage or catalog terms.
