# MaxPoints app review

## Implementation follow-up

The findings below are the original review, not the current deployment status. The subsequent tested batches address all 15 categories:

- Owner-only email-code sessions, per-route authorization, ownership checks, CSRF protection, bounded input validation, and removal of public initialization routes.
- Shared date/currency accounting, lifetime one-time usage, recurring-year handling, owner-timezone countdowns, period limits, and exclusion of insurance/estimated values from cash-credit totals.
- One authoritative dashboard request, payload validation, error/retry states, reopenable card dialogs, partial-credit due lists, and separate renewal/expiration settings.
- Atomic idempotent usage writes, editable history, reversible removal, and capacity validation under locks.
- Transactional preview/confirm spreadsheet imports, safe no-op seeding on an existing catalog, versioned additive migrations, catalog source metadata and before-image revisions, and manual benefit corrections.
- Owner-only reminders with saved preferences, availability notices, a durable daily payload, provider idempotency, and visible configuration/status.
- A separately authenticated, bounded OpenClaw suggestion inbox. It cannot read personal records or silently mutate benefit/usage data.
- Updated dependencies, zero npm audit advisories at verification, and focused policy, route, spreadsheet, database concurrency and browser tests.

### Deployment and remaining checks

Changes were tested and pushed to main in batches. Production database changes were additive; full local ledger backups were taken before benefit/date reconciliation. Apple TV remains recorded as used at $156, with the supplied June 22, 2027 end date and no automatic annual reset.

Historical annual aggregates whose cadence changed are retained and marked for review, not guessed into individual months. They count toward annual totals but require actual dates/amounts before consuming a current-period balance or triggering reminders. Other unverified benefit terms remain editable; scraped content is not treated as authoritative.

Real email inbox receipt and the phone sign-in flow still require the owner's check. Automated email tests use a mock sender. Vercel's sensitive email/cron values are present in production but cannot be exported by env pull, so local email delivery is not fully configured. The owner is bound to the existing account ID; the existing alert-email setting is used for login.

OpenClaw has not been activated or sent credentials because its supplied admin URL is plaintext HTTP. Secure its administration channel before installing the ingest key. Scraper selectors require a live integration check and now fail visibly if content is absent.

Browser verification used disposable records, including usage logging/editing/removal/restoration, benefit edits, preferences, modal reopening, year changes and desktop/mobile layouts. Card-date API persistence was verified; automated date-input interaction was inconclusive and should also be checked on the phone.

---

Reviewed September 16, 2026 (America/New_York), against commit e861cae plus existing local changes.

## Scope and evidence

- Read the dashboard, components, all API route groups, schema, seed logic, email delivery, and OpenClaw integration calls.
- Used unauthenticated, read-only requests against https://mxpoints.vercel.app. Cards, perks, and usage returned HTTP 200: 3 cards, 44 perks, and 22 usage entries at the time of inspection.
- Tested opening, closing, and reopening a card in the live browser.
- Ran isolated calculations using the actual utility module, a production build, lint, and npm audit.
- No production records were changed, no emails sent, and no initialization or synchronization endpoints invoked during this review.
- Production build and TypeScript passed. Lint reported 46 errors and 7 warnings. npm audit reported 17 affected packages: 1 critical, 12 high, 3 moderate, 1 low. These are dependency advisory classifications, not demonstrated exploits in this app.
- The two existing local changes in app/page.tsx and package-lock.json were preserved. Build outputs are local; this review does not deploy changes.

## Findings, ordered by priority

### 1. P1: Public access to personal data and mutation routes

Evidence: app/api/usage/route.ts:28, :63, :135; app/api/cards/route.ts:13; app/api/perks/route.ts:5; app/api/user-cards/[id]/route.ts:44.

The live cards, perks, and usage endpoints return data without cookies or authentication. Normal mutation handlers also have no session checks; choosing user.findFirst() is not authentication. The ownership filter added to deletion narrows the record to the default user but does not verify the caller. Arbitrary callers can reach handlers that alter card settings and usage. Write access was established from code inspection, not tested by modifying production.

Fix: require a verified session for every personal-data read and write; restrict access to the owner's account initially. Scope all queries to that user, including UserCard data. Add request validation and tests for unauthenticated and wrong-owner requests. Keep machine credentials separate for automation.

### 2. P1: Administrative database operations remain HTTP GET endpoints

Evidence: app/api/setup/route.ts:7; app/api/create-tables/route.ts:4; app/api/init-db/route.ts:5; app/api/migrate/route.ts:4; app/api/sync-perks/route.ts:142.

Initialization, schema changes, and benefit reconciliation are available as normal unauthenticated route handlers. The sync endpoint changes values, adds benefits, and removes selected unused benefits on GET. A link visit or automated GET can trigger mutations. The setup route explicitly warns that it should be removed, and its recovery logic treats any user-count error as a missing-table condition.

Fix: move these operations into versioned deployment migrations or authenticated administrative commands. Do not run them as part of ordinary page navigation. Verify existing production data before applying reconciliation.

### 3. P1: One-time usage disappears from calculated balances

Evidence: lib/utils.ts:77; app/api/usage/route.ts:93; app/api/perks/route.ts:36.

getPeriodDates has no one-time case, so it returns start=now and end=now. A usage entry saved earlier is outside that zero-length range on the next request. The record remains in history, but its balance becomes zero again and another full usage can be logged. Both live Global Entry benefits currently use this zero-length range. Isolated reproduction confirmed that an entry one second earlier is excluded.

Fix: model lifetime or explicit multi-year benefit eligibility and activation dates; use a stable period identifier. Test create, reload, delete, and eligibility renewal for one-time benefits.

### 4. P1: Monthly and semiannual limits are represented as annual pools

Evidence: prisma/seed.ts:82; live perk responses for Digital Entertainment, Uber Cash, Walmart+, and DoorDash.

The app's own descriptions specify monthly limits but their stored periodType is annual. Hotel credit is described as semiannual but stored as a $600 annual pool. This allows a full annual amount to be marked used at once and cannot distinguish missed months from currently usable credit. It also schedules reminders against year-end instead of the actual benefit period.

Fix: separate annual potential value from the amount available in each claim period. Support unequal periods such as Uber's December bonus. Preserve historical usage and request clarification where existing lump-sum entries cannot be allocated confidently. Confirm issuer terms when updating the catalog; this review is not a fresh external verification of every benefit.

### 5. P1: Recurring periods are frozen in 2026

Evidence: prisma/seed.ts:62; app/api/cards/route.ts:5; app/api/perks/route.ts:36. Live data contains 21 records with fixed 2026 start dates.

Quarter and half-year records remain tied to 2026. There is no year-rollover process, and the API always prefers those fixed dates. In 2027 the app will continue showing old periods and old usage alongside annually resetting benefits. Annual-fee coverage will mix years.

Fix: keep benefit definitions separate from period instances; generate periods by year and preserve historical periods. Add a reporting-year selector and explicit annual versus card-anniversary rules. Test December 31 to January 1 without rewriting old usage.

### 6. P1: Recoverable API failures crash the dashboard

Evidence: app/page.tsx:113 and :143.

The page parses JSON and stores it as arrays without checking HTTP status or payload shape. Error objects later reach map/reduce outside the fetch try/catch. A database timeout during the preceding implementation session produced the actual perks.map is not a function crash. The local defensive change only covers fetchCards, not initial dashboard loading or modal loading.

Fix: validate responses, retain last successful data, expose a retry action, and show a clear error state rather than a blank page or misleading zero totals. Test individual cards/perks failures and recovery.

### 7. P2: Closing a card prevents reopening the same card

Evidence: app/page.tsx:107, :233, :300.

Reproduced in production: open Amex Platinum, close it, then click Amex Platinum again; nothing opens. Closing changes showPerkModal but leaves selectedCard unchanged. Clicking the same object does not rerun the effect that opens the modal. Overlapping card requests also lack cancellation and can display stale results under a newer selection.

Fix: use an explicit open-card action with loading state; make opening independent of whether the selection changed, and cancel or discard stale responses. Clicking a due perk should additionally focus that specific perk.

### 8. P2: Incorrect date boundaries, completion status, and monetary display

Evidence: lib/utils.ts:7, :68, :189; prisma/seed.ts:63; app/api/usage/route.ts:13; components/perk-item.tsx:62.

- Fixed end dates are midnight UTC at the start of the final day. September 30 at noon is outside a period ending September 30 at midnight.
- Future and expired usage is silently dated to the start/end of the period rather than the actual usage date; the earlier Q4 mistake was recorded as October 1 despite being entered September 16.
- The dashboard and modal use different day calculations; the live dashboard showed 14 days while the modal previously showed 13 for the same deadline.
- An already expired perk is labeled expiring. No expired/not-yet-active state exists.
- $99.60 of $100 is rounded to 100% and treated as completed, hiding the remaining 40 cents.
- $15.47 is displayed as $15, including in deletion confirmations. The database uses floating-point amounts, and live remaining value includes 15.469999999999999.

Fix: use user-timezone calendar dates and exclusive next-period boundaries; retain both recordedAt and actual usage date. Use exact amount comparisons for completion and integer cents or decimals for money. Show cents where relevant, especially history, input, and confirmation dialogs.

### 9. P2: Remaining value includes expired and non-cash benefits

Evidence: components/card-summary.tsx:12; app/page.tsx:172; components/summary-overview.tsx:13.

The current remaining-value calculation includes $315.47 from expired periods: Lululemon Q1, Hilton Resort H1, and Flight Q1/Q2. The live due list also presents $800 Cell Phone Protection as an unused credit due at year-end. Insurance coverage and estimated membership values are combined with redeemable statement credits, so potential value is not the same as money actually available or saved.

Fix: distinguish available now, future, expired unused, actual credits received, and estimated non-cash value. Calculate annual fee coverage against a clearly selected reporting period and user-valued benefits.

### 10. P2: Partially used perks disappear from the due list

Evidence: app/page.tsx:23.

The filter requires currentUsage===0, so an almost-expiring $100 perk with $1 used disappears even though $99 remains. Live partially used annual perks include DoorDash with $250 remaining and Digital Entertainment with $204.05 remaining. The label says unused, but the workflow should surface unused balances, not only untouched benefits.

Fix: show every eligible perk with positive remaining value, sorted by deadline. Add Available now, Coming soon, Used, and Expired filters instead of one long modal.

### 11. P2: Usage writes can duplicate and deletion has no recovery

Evidence: app/api/usage/route.ts:95, :111, :149; components/perk-item.tsx:44.

The maximum-usage check and insertion are separate operations. Concurrent requests can both pass the check and overspend the perk; there is no idempotency key for retries. Delete permanently removes the row. The new confirmation reduces accidental clicks but cannot undo an accidental deletion, and client totals are adjusted from local state rather than replaced with authoritative server totals.

Fix: serialize writes per user/perk/period, enforce precision and bounds, add request idempotency, and introduce a recoverable deleted state with undo. Return recalculated balances after mutations. Test two concurrent writes, retry-after-timeout, stale tabs, and delete/restore.

### 12. P2: Imports and seeds can duplicate data or stop halfway

Evidence: app/api/import/route.ts:59, :107, :140; prisma/seed.ts:104, :205, :214; app/api/setup/route.ts:12.

Imports use user-default while normal seed/setup paths generate user IDs. Imported perk IDs differ from generated seed IDs, and each repeat import inserts usage again. Import and seed operations span many writes without a wrapping transaction. Seeds upsert users/cards but always create perks and user-card relationships, so rerunning can create duplicate perks before failing on an existing relationship. Setup can skip recovery once a partially initialized user exists.

Fix: validate the complete import first, show a preview, use stable benefit identifiers and an explicit user, then transact with deduplication. Replace repeated initialization variants with one migration path. Add rollback and repeat-import tests.

### 13. P2: Live benefits and code definitions have drifted

Evidence: app/api/setup/route.ts:139; prisma/seed.ts:184; app/api/sync-perks/route.ts:34; live Apple and Hilton records.

Apple TV is correctly $156 used in live data, but seed/setup still define the old $288 bundle. The split left Apple Music at $132 by subtraction from the old combined value; that is not independently verified issuer pricing. Other code reconciliation changes are not reflected in live data, including Hilton CLEAR's code value of $209 versus live $189. Initialization paths also differ on whether quarterly records have explicit dates.

Fix: maintain one versioned benefit catalog with effective dates, source URL, last-verified date, and personal overrides. Add an owner-facing edit benefit screen for values, dates, activation, and notes. Reconcile with a preview that preserves usage rather than blindly running the current sync endpoint.

### 14. P2: Notifications and automation have incomplete reliability controls

Evidence: app/api/cron/perk-expiration-emails/route.ts:151, :216, :238; prisma/schema.prisma:111; openclaw-skills/deal-scanner/skill.js:81; openclaw-skills/perk-monitor/skill.js:99.

Email is sent before reminder records are written; concurrent runs or a failure after delivery can send duplicates. Reminder keys are stored in JSON without uniqueness. All recipients are combined into one configured destination, and perk usage is not filtered by user in reminder calculations. The stored timezone and reminderDays preferences are not used. These user-isolation issues become material if a second account is added.

OpenClaw scripts call /api/deals/process and /api/perks/changes, neither of which exists in the build's route list. Deployment or functionality of the external OpenClaw instance was not verified.

Fix: unique reminder jobs, delivery idempotency, bounded retry history, per-user timezone/preferences and recipients. Provide a notification test/status view. Implement and authenticate the automation route contracts before treating the integration as operational.

### 15. P2: Dependencies and verification need maintenance

Evidence: package.json; npm audit and lint outputs from this run.

The build passes, but lint has 46 errors and 7 warnings. No project-owned automated test files were found in the inspected tree. npm audit classifies Next.js as critical and flags other direct and transitive dependencies, including xlsx. Some advisories depend on features or deployment conditions this app may not use, so audit counts must not be equated with confirmed exploitability. A blind audit fix could also propose incompatible changes.

Fix: review advisory applicability, upgrade to tested patched releases, replace or update the spreadsheet parser through a supported distribution, and add CI checks for type safety, build, API authorization, period rollover, arithmetic, and correction flows.

## Efficiency and maintainability

- Initial load downloads cards plus all perks with overlapping nested usage, about 58 KB of uncompressed JSON in this snapshot. Opening a card fetches its perks again, and opening history fetches data that was already included. Current warm requests were about 0.1-0.6 seconds in one sample; this is not a load test. Use one bounded dashboard summary and fetch detailed history on demand.
- Both main endpoints load usage history and aggregate it in JavaScript. Add indexes on Usage(userId, perkId, date), Perk(cardId), and targeted notification keys when revising the data model. Push period filtering and aggregation into database queries; current scale is small, so correctness has higher priority than micro-optimization.
- Store one authoritative dashboard cache instead of independently maintaining cards, allPerks, modal perks, and history. Invalidate or reconcile it after changes and on foreground/reconnect.
- Centralize the duplicated period calculations shared by cards, perks, usage, and reminders.
- Separate card expiration from annual-fee renewal; renewalDate is currently used as expiration and cannot represent both concepts.
- Improve phone workflows with focused perk navigation, search, period filters, edit amount/date, immediate undo, and recoverable deletions. Keep subscription activation separate from recurring reimbursement usage.

## Suggested implementation order

1. Protect personal data and remove web-accessible administration; verify authorized phone access before release.
2. Repair period accounting, dates, exact money, year rollover, and benefit categorization with migration previews that preserve history.
3. Fix dashboard recovery and modal reopening; include partial balances and make corrections editable and recoverable.
4. Consolidate the benefit catalog and add the owner-facing editor; reconcile live data with verified sources.
5. Make reminders/imports/automation reliable, reduce repeated queries, and enforce CI and dependency maintenance.

## Verification plan for fixes

- Session absent, correct owner, wrong owner, and machine credentials across every API route.
- Monthly/quarterly/semiannual/annual/one-time periods, final day, timezone boundary, daylight-saving change, and year rollover.
- Full/partial usage, cents, near-completion, two simultaneous writes, network retry, old-period corrections, delete and restore.
- Initial API failure/recovery, same-card reopening, rapid card switching, and mobile modal/history/confirmation layout.
- Repeated imports, malformed rows, partially initialized databases, migration rollback, and preservation of existing usage.
- Reminder dry runs, concurrent jobs, post-send failures, user-specific preferences and delivery history.

No fixes were applied as part of this review. Production data, current deployment settings, email delivery status, backup retention, and external OpenClaw configuration require separate change-specific verification before rollout.
