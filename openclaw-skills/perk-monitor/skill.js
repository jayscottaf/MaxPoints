/**
 * MaxPoints Perk Monitor Skill for OpenClaw
 * Monitors card benefits pages for changes
 */

const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Configuration
const MAXPOINTS_API = process.env.MAXPOINTS_API_URL || 'http://localhost:3000/api';

// Card benefit pages to monitor
const CARD_PAGES = [
  {
    cardId: 'amex-platinum',
    name: 'Amex Platinum',
    url: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
    benefitsSelector: '.benefits-list'
  },
  {
    cardId: 'amex-hilton-aspire',
    name: 'Amex Hilton Aspire',
    url: 'https://www.americanexpress.com/us/credit-cards/card/hilton-honors-aspire/',
    benefitsSelector: '.card-benefits'
  },
  {
    cardId: 'chase-reserve',
    name: 'Chase Sapphire Reserve',
    url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
    benefitsSelector: '.benefit-details'
  }
];

// Store hashes of benefit pages to detect changes
let benefitHashes = {};

async function fetchBenefits(card) {
  try {
    const response = await axios.get(card.url);
    const $ = cheerio.load(response.data);

    // Extract benefits text
    const benefitsText = $(card.benefitsSelector).text()
      .replace(/\s+/g, ' ')
      .trim();

    // Create hash of benefits content
    const hash = crypto.createHash('md5')
      .update(benefitsText)
      .digest('hex');

    return {
      cardId: card.cardId,
      cardName: card.name,
      content: benefitsText,
      hash: hash,
      url: card.url
    };
  } catch (error) {
    console.error(`Error fetching benefits for ${card.name}:`, error.message);
    return null;
  }
}

async function checkForChanges() {
  console.log('Checking for benefit changes...');
  const changes = [];

  for (const card of CARD_PAGES) {
    const benefits = await fetchBenefits(card);

    if (!benefits) continue;

    // Check if benefits have changed
    const previousHash = benefitHashes[card.cardId];
    if (previousHash && previousHash !== benefits.hash) {
      changes.push({
        cardId: card.cardId,
        cardName: card.name,
        url: card.url,
        detectedAt: new Date()
      });
      console.log(`Changes detected for ${card.name}`);
    }

    // Update stored hash
    benefitHashes[card.cardId] = benefits.hash;
  }

  return changes;
}

async function notifyChanges(changes) {
  if (changes.length === 0) return;

  try {
    // Send to MaxPoints API
    await axios.post(`${MAXPOINTS_API}/perks/changes`, {
      changes: changes,
      timestamp: new Date()
    });

    console.log('Changes reported to MaxPoints');
  } catch (error) {
    console.error('Failed to report changes:', error.message);
  }
}

// OpenClaw skill interface
module.exports = {
  name: 'maxpoints-perk-monitor',
  description: 'Monitors credit card benefits for changes',

  // Run this skill
  async run(context) {
    const changes = await checkForChanges();

    if (changes.length > 0) {
      const message = `⚠️ Credit card benefits have changed:\n` +
        changes.map(c => `• ${c.cardName} - Check: ${c.url}`).join('\n');

      // Send notification through OpenClaw
      await context.notify(message);

      // Report to MaxPoints API
      await notifyChanges(changes);
    } else {
      console.log('No benefit changes detected');
    }

    return { success: true, changesDetected: changes.length };
  },

  // Schedule configuration (run weekly on Sundays at 8am)
  schedule: '0 8 * * 0'
};