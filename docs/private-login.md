# Private Login

Only the email in `OWNER_EMAIL` (or existing `PERK_ALERT_EMAIL`) can sign in.
Set `OWNER_USER_ID` to the existing user's ID to preserve a legacy account whose
database email is a placeholder. Otherwise the account is resolved by email.
There is no public registration or automatic account creation.

Required production settings: `DATABASE_URL`, `RESEND_API_KEY`,
`PERK_ALERT_FROM`, and `OWNER_EMAIL` or `PERK_ALERT_EMAIL`.
Keep these server-only. Vercel sensitive values cannot be pulled back locally;
use separate development credentials rather than copying `[SENSITIVE]` placeholders.

Codes expire after ten minutes, are browser-bound, and allow five attempts.
Requests are limited to one per minute and five per hour in PostgreSQL.
Only hashes of codes and random session tokens are stored. Sessions expire after
30 days, use HttpOnly/SameSite cookies, and require HTTPS in production.
State-changing browser requests must have the same Origin as the app.

Run `npm run db:migrate` before deploying schema changes. Migrations are additive,
checksummed SQL files under `prisma/migrations`, executed with a database lock.
The old public setup and migration endpoints have been removed.

Verification: `npm test`, `npm run build`, then test anonymous API rejection and
the login page in a browser. Real email delivery must be checked on an environment
with valid email credentials. Never log codes, session tokens, or environment secrets.
