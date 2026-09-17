# Reminder delivery

The daily Vercel cron runs at 13:00 UTC. Dates and benefit boundaries use the owner's saved timezone; the execution hour is fixed UTC and shifts with daylight saving time.

Card Settings includes expiry/availability toggles, timezone, optional comma-separated days before expiry, today's read-only reminder preview, and configuration/delivery status. An empty reminder-days field uses the period-specific schedule. Credits awaiting historical allocation are excluded to avoid misleading reminders.

Only the configured owner is queried and only OWNER_EMAIL (or the existing PERK_ALERT_EMAIL fallback) receives reminders. No hardcoded recipient is used. RESEND_API_KEY, PERK_ALERT_FROM and CRON_SECRET must be configured. The cron remains separately protected with a constant-time bearer-secret comparison.

EmailDelivery persists the exact daily payload before delivery. Concurrent calls reuse its deterministic Resend idempotency key and create one notification record. Successful provider acceptance is recorded; this is not proof of inbox delivery. Failed calls may be retried within 23 hours. Older uncertain requests require manual provider-log review instead of risking a duplicate after Resend's 24-hour deduplication window. Vercel's once-daily schedule is not a rapid retry worker.

The settings preview never sends email. Real inbox delivery must be checked from the owner's phone. Tests use disposable database records and a mocked email sender, never real messages.
