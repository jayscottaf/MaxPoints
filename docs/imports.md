# Usage Imports

Use an `.xlsx` workbook under 2 MB with a `Perks` sheet and these headers:
`Card`, `Perk / Credit`, `Amount Used (USD)`, and optional `Usage Date` (`YYYY-MM-DD`).
Amounts are cumulative annual totals, not individual transactions. One row per
perk is allowed, with up to 1,000 rows. Preview shows only positive differences
from saved usage. Reimporting the same totals adds nothing. A lower total never
silently deletes usage; correct that through usage history instead.

Names must match an existing owned card and perk. Imports do not change benefit
terms, create duplicate catalog entries, or overwrite personal settings. Annual
totals are marked for period review rather than assigned to an invented month.
The entire import is validated and written in one transaction.

Dependency overrides: Prisma 6's `deepmerge-ts` is pinned to patched 8.0.0 and
ExcelJS's `uuid` to CommonJS-compatible 11.1.1. Generation, workbook read/write,
database integration tests, and production build are checked with these overrides.
