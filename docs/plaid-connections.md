# Plaid Connections

Checked October 18, 2026: the owner's existing Plaid team has Pay As You Go,
Transactions enabled at $0.30 per Item/month, no monthly minimum, and both
American Express and Chase OAuth access enabled. Two logins cost about
$0.60/month; a separate login for each of three cards costs about $0.90/month.
These are the observed account rates, not a promise of universal Plaid pricing.
The newer free Trial does not apply to this already-approved Production team.

## Configuration

Apply `007_bank_connections.sql` before deploying. Configure these server-only
variables through the deployment's secret store:

- `PLAID_CLIENT_ID`
- `PLAID_SECRET` for the chosen environment
- `PLAID_ENV`: `sandbox` or `production`; defaults to `sandbox`
- `PLAID_TOKEN_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters
- `NEXT_PUBLIC_APP_URL`: the canonical application origin
- `CRON_SECRET`: shared with the existing Vercel scheduler

Allow `https://mxpoints.vercel.app/bank-link` as a redirect URI in Plaid.
Never rotate the encryption key without decrypting/re-encrypting existing tokens.
Never log access tokens, API credentials, Link tokens or complete provider errors.
Keep the existing application profile and other redirect URIs intact if this team
is shared with another project.

## Behavior

Settings > Banks & credits starts Link. The user grants access directly through
Amex/Chase and explicitly assigns each shared credit-card account to a tracked
card. Only Transactions is requested. No Balance, Recurring Transactions, Auth,
Statements or Transactions Refresh endpoints are called.

The daily `/api/cron/bank-sync` job runs at 12:00 UTC. Manual Sync retrieves the
latest data already available in Plaid and does not force a paid refresh.
Transaction updates are staged across all pages, then applied with the cursor
in one transaction. A pagination mutation restarts the complete staged batch.
Concurrent imports use a connection lock and compare the persisted cursor.

Only identifiable, posted USD benefit credits from assigned cards enter review.
Purchases, payments, ordinary refunds and pending transactions are excluded.
Unrelated transaction details are not retained. Delayed credits may propose a
recently ended benefit period; the owner confirms the purchase/usage date.
Activity > Bank credit review and Settings both expose approve/dismiss/history.
Approval uses the normal usage capacity/date checks, a stable request key, and
an atomic usage/suggestion transaction. Nearby matching usage requires explicit
acknowledgment to guard against logging a previously entered credit twice.

Modified or removed bank credits that were already approved become review
warnings. They never silently rewrite the usage ledger. The owner corrects usage
through existing Activity/history controls. Disconnect calls `/item/remove`,
clears the encrypted token, and preserves approved history. Plaid monthly fees
are not prorated and removing an Item is what stops its ongoing subscription.

Bank connection and approval routes require the owner session and same-origin
requests. Access tokens are encrypted with AES-256-GCM, stay server-side, and
are excluded from API responses. Production and Sandbox tokens cannot mix.

## Verification

The test suite covers conservative matching, delayed credit periods, authenticated
encryption/tampering, staged pagination restart, import duplication, owner
isolation, capped approval amounts, concurrent approval, changed/removed credits,
and preserving the cursor on failed imports. Browser tests use a disposable
account, never the owner's credit history. Live OAuth requires the owner's bank
authorization and configured Production credentials.

Sources: [Plaid pricing](https://plaid.com/pricing/),
[Trial eligibility](https://support.plaid.com/hc/en-us/articles/39994173227159-What-is-the-Plaid-Trial-plan),
[OAuth](https://plaid.com/docs/link/oauth/),
[Transactions sync](https://plaid.com/docs/api/products/transactions/),
[Billing](https://plaid.com/docs/account/billing/).
