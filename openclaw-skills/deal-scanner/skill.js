/**
 * MaxPoints Deal Scanner Skill for OpenClaw
 * Scans credit card deal sites for relevant offers
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { queueSuggestion, eventId } = require('../client');

// Configuration
const DEAL_SOURCES = [
  {
    name: 'Doctor of Credit',
    url: 'https://www.doctorofcredit.com/category/credit-cards/',
    selector: '.entry-title a'
  },
  {
    name: 'The Points Guy',
    url: 'https://thepointsguy.com/category/credit-cards/',
    selector: '.post-title a'
  }
];

// Card keywords to filter relevant deals
const CARD_KEYWORDS = [
  'amex platinum',
  'american express platinum',
  'hilton aspire',
  'chase sapphire reserve',
  'sapphire reserve',
  'transfer bonus',
  'amex offers',
  'chase offers'
];

async function fetchDeals(source) {
  try {
    const response = await axios.get(source.url, { timeout: 15000, maxContentLength: 2000000 });
    const $ = cheerio.load(response.data);
    const deals = [];
    if (!$(source.selector).length) throw new Error(`No matching content on ${source.name}; source selector needs review.`);

    $(source.selector).each((index, element) => {
      const title = $(element).text().toLowerCase();
      const href = $(element).attr('href');

      // Check if deal is relevant to our tracked cards
      const isRelevant = CARD_KEYWORDS.some(keyword => title.includes(keyword));

      if (isRelevant && href) {
        const url = new URL(href, source.url);
        if (url.protocol !== 'https:') return;
        deals.push({
          title: $(element).text(),
          url: url.href,
          source: source.name,
          foundAt: new Date()
        });
      }
    });

    return deals;
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error.message);
    throw error;
  }
}

async function checkForNewDeals() {
  console.log('Starting deal scan...');
  let allDeals = [];

  // Fetch deals from all sources
  for (const source of DEAL_SOURCES) {
    const deals = await fetchDeals(source);
    allDeals = allDeals.concat(deals);
  }

  console.log(`Found ${allDeals.length} relevant deals`);

  // Send to MaxPoints API
  if (allDeals.length > 0) {
    try {
      for (const deal of allDeals.slice(0, 50)) await queueSuggestion({ kind: 'deal', title: deal.title.trim().slice(0, 200), message: `Potential offer from ${deal.source}. Verify the current terms before use.`, sourceUrl: deal.url, eventId: eventId(`deal:${deal.url}`) });
      console.log('Deals sent to MaxPoints');
    } catch (error) {
      console.error('Failed to send deals:', error.message);
      throw error;
    }
  }

  return allDeals;
}

// OpenClaw skill interface
module.exports = {
  name: 'maxpoints-deal-scanner',
  description: 'Scans credit card deal sites for MaxPoints',

  // Run this skill
  async run(context) {
    const deals = await checkForNewDeals();

    if (deals.length > 0) {
      const message = `Found ${deals.length} new credit card deals:\n` +
        deals.map(d => `• ${d.title}`).join('\n');

      // Send notification through OpenClaw
      await context.notify(message);
    }

    return { success: true, dealsFound: deals.length };
  },

  // Schedule configuration (run daily at 6am)
  schedule: '0 6 * * *'
};
