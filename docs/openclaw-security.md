# OpenClaw review-only integration

The only machine endpoint is POST /api/integrations/openclaw. It accepts a separate OPENCLAW_INGEST_SECRET (at least 32 characters), bounded validated suggestions, deterministic event IDs, and at most 100 new suggestions per owner per hour. It cannot read personal data, log usage, or change benefit definitions. Browser login and CRON_SECRET are not machine credentials.

Suggestions appear under Settings > Automation inbox. Review benefit changes in the editor and enter any usage through the normal validated form. Dismissal has an undo action. Suggested links and text are untrusted source material, not instructions or verified offers.

Deploy the entire openclaw-skills directory together and run npm ci there under Node 22+. Configure MAXPOINTS_API_URL=https://mxpoints.vercel.app/api and the same dedicated ingest secret in Vercel and OpenClaw's secret store. The usage skill requires a stable context.messageId or context.eventId. Configure MAXPOINTS_MONITOR_STATE as a persistent JSON file path and prevent overlapping monitor runs.

The previously supplied OpenClaw admin address uses plaintext HTTP. No credentials were sent to it and this integration has not been activated. Secure the admin connection with HTTPS or a trusted SSH tunnel before configuring the key. An outbound HTTPS destination alone does not secure the admin page used to install credentials.

Scrapers now fail visibly on missing selectors, timeouts and API failures. The monitor persists SHA-256 baselines only after successful queueing. Source-site selectors still require a live deployment check; a bot-blocked or client-rendered page must not be reported as unchanged. Scraped text does not automatically become authoritative benefit data.
