const { createHash } = require('node:crypto');

function endpoint() {
  const url = new URL(process.env.MAXPOINTS_API_URL || 'https://mxpoints.vercel.app/api/');
  if (url.protocol !== 'https:') throw new Error('MaxPoints automation requires HTTPS.');
  if (!process.env.OPENCLAW_INGEST_SECRET || process.env.OPENCLAW_INGEST_SECRET.length < 32) throw new Error('OPENCLAW_INGEST_SECRET is not configured.');
  return `${url.href.replace(/\/$/, '')}/integrations/openclaw`;
}
async function queueSuggestion(input) {
  const response = await fetch(endpoint(), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENCLAW_INGEST_SECRET}` }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(`MaxPoints rejected suggestion (${response.status}).`);
  return response.json();
}
const eventId = value => createHash('sha256').update(value).digest('hex');
module.exports = { queueSuggestion, eventId, endpoint };
