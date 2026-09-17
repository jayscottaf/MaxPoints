const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('node:fs/promises');
const path = require('node:path');
const { queueSuggestion, eventId } = require('../client');

const pages = [
  { name: 'Amex Platinum', url: 'https://www.americanexpress.com/us/credit-cards/card/platinum/', selector: '.benefits-list' },
  { name: 'Amex Hilton Aspire', url: 'https://www.americanexpress.com/us/credit-cards/card/hilton-honors-aspire/', selector: '.card-benefits' },
  { name: 'Chase Sapphire Reserve', url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve', selector: '.benefit-details' }
];

module.exports = {
  name: 'maxpoints-perk-monitor',
  description: 'Queue benefit-page changes for owner review',
  schedule: '0 8 * * 0',
  async run(context) {
    const stateFile = process.env.MAXPOINTS_MONITOR_STATE;
    if (!stateFile) throw new Error('Set MAXPOINTS_MONITOR_STATE to a persistent JSON file path.');
    let hashes = {};
    try { hashes = JSON.parse(await fs.readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const next = { ...hashes };
    let changes = 0;
    for (const page of pages) {
      const response = await axios.get(page.url, { timeout: 15000, maxContentLength: 2000000 });
      const $ = cheerio.load(response.data);
      const content = $(page.selector).text().replace(/\s+/g, ' ').trim();
      if (content.length < 80) throw new Error(`Benefit content missing for ${page.name}; review the source selector.`);
      const hash = eventId(content);
      if (hashes[page.url] && hashes[page.url] !== hash) {
        await queueSuggestion({ kind: 'benefit-change', title: `${page.name} benefit page changed`, message: 'Source content changed. Review official terms before updating the benefit catalog.', sourceUrl: page.url, eventId: eventId(`${page.url}:${hash}`) });
        changes++;
      }
      next[page.url] = hash;
    }
    // Advance the durable baseline only after every source and queue request succeeds.
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    const temporary = `${stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
    await fs.rename(temporary, stateFile);
    if (changes) await context.notify(`${changes} benefit changes queued for review in MaxPoints.`);
    return { success: true, changesDetected: changes };
  }
};
