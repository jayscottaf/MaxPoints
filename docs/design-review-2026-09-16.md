# MaxPoints Design Review

## Findings and Changes

- The previous dashboard gave large summaries and individual benefit panels similar visual weight. The new overview prioritizes recovered value, available credit, annual fees, and the next benefits to use.
- Long card dialogs made a specific benefit difficult to locate. Benefits now have search, card and status filters, and focused detail dialogs.
- Phone navigation depended on scrolling through the dashboard. A persistent bottom navigation now separates Overview, Benefits, Wallet, and Activity; upcoming benefits appear before the wallet on phones.
- Settings mixed unrelated workflows. Card details, Notifications, Import, and Automation now have separate keyboard-accessible tabs.
- Inconsistent dark form styles and overly prominent containers made scanning harder. Shared typography, spacing, neutral surfaces, restrained status colors, and issuer card artwork establish a consistent visual system.
- Usage correction was buried inside card details. Activity and direct benefit opening make the existing remove/restore and edit controls easier to reach.

## Verification

- All 26 automated tests pass, including database integration, authentication, ledger concurrency, benefit filtering, import validation, and notifications.
- ESLint and the Next.js production build pass.
- Browser-tested search, focused benefit opening, partial logging, removal and restoration, activity, the global usage chooser, and settings tabs using disposable fixture data.
- Checked layouts at 320px and 390px phone widths and 1440px desktop width; verified issuer images load and the overview has no horizontal overflow.
- Checked settings tab keyboard navigation and modal close/focus behavior.
- Personal production usage and benefit terms were not changed by this redesign.

## Scope

Authentication and accounting remain server-authoritative and unchanged. Activity is explicitly limited to the API's most recent 200 entries. This is a tested visual and workflow redesign, not a claim of an external accessibility certification or design award.
