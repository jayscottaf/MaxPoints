# Repeat credit approval

Opt-in is per posted baseline credit in Bank credit review / History. Only Amex Platinum monthly Digital Entertainment and Walmart+ are eligible. The baseline must be linked to one active, verified, exact-amount usage in the same month. An existing pending credit can be matched to an already logged usage without creating a second usage. Enabling a newer baseline pauses older rules for that account and benefit.

The authenticated sync action accepts `rescan: true` to re-read Plaid's existing history when recovering a previously unmatched baseline. It does not call the paid refresh endpoint, clear existing approvals, or auto-approve old records.

Sync requires the same account, one benefit candidate, exact normalized description, exact amount, USD, and a posted credit. Only newly imported current-month credits posted after opt-in and in a later month than the baseline qualify. Days 1–3 and 26–31, and postings more than five days from the baseline day, remain manual. Historical queue entries are not auto-approved. Any recorded usage (including unverified usage), another bank candidate that month, insufficient capacity, changed or removed baseline, or edited/deleted baseline usage prevents approval. The whole sync batch is staged before evaluation. User/perk and connection locks protect concurrent sync and manual logging.

Automatic approvals retain transaction, usage and baseline IDs in history. Undo soft-deletes usage, pauses the account/benefit rule and retains an undone transaction marker across resync. Changes/removals from the bank require review and never rewrite recorded usage.

Walmart+ statement reimbursements include applicable taxes. The nominal allowance remains $12.95 monthly; an exact posted bank reimbursement can retain its tax-inclusive amount, with one reimbursement per month and annual capacity measured against nominal fees. This exception is internal to the ledger service and requires an owned, mapped, posted USD bank credit, never an arbitrary client-provided allowance.

Terms verified October 23, 2026: https://global.americanexpress.com/card-benefits/detail/walmart-platinum/platinum
