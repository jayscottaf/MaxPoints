/**
 * MaxPoints Deal Scanner Skill for OpenClaw
 * Scans credit card deal sites for relevant offers
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Configuration
const MAXPOINTS_API = process.env.MAXPOINTS_API_URL || 'http://localhost:3000/api';
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
    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data);
    const deals = [];

    $(source.selector).each((index, element) => {
      const title = $(element).text().toLowerCase();
      const href = $(element).attr('href');

      // Check if deal is relevant to our tracked cards
      const isRelevant = CARD_KEYWORDS.some(keyword => title.includes(keyword));

      if (isRelevant) {
        deals.push({
          title: $(element).text(),
          url: href,
          source: source.name,
          foundAt: new Date()
        });
      }
    });

    return deals;
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error.message);
    return [];
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
      await axios.post(`${MAXPOINTS_API}/deals/process`, {
        deals: allDeals,
        timestamp: new Date()
      });
      console.log('Deals sent to MaxPoints');
    } catch (error) {
      console.error('Failed to send deals:', error.message);
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