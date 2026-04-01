/**
 * MaxPoints Usage Logger Skill for OpenClaw
 * Natural language interface for logging perk usage
 */

const axios = require('axios');

// Configuration
const MAXPOINTS_API = process.env.MAXPOINTS_API_URL || 'http://localhost:3000/api';
const USER_ID = process.env.MAXPOINTS_USER_ID || 'user-default';

// Perk name mappings for natural language
const PERK_MAPPINGS = {
  'resy': 'Resy Dining Credit',
  'lululemon': 'Lululemon Credit',
  'saks': 'Saks Fifth Avenue Credit',
  'uber': 'Uber Cash',
  'hotel': 'Hotel Credit',
  'airline': 'Airline Incidental Fee Credit',
  'hilton resort': 'Hilton Resort Credit',
  'hilton dining': 'Hilton Dining Credit',
  'travel credit': 'Annual Travel Credit',
  'dining': 'Dining Credit',
  'entertainment': 'Entertainment Credit',
  'doordash': 'DoorDash Credits'
};

// Parse natural language input
function parseUsageInput(input) {
  const lowerInput = input.toLowerCase();

  // Extract amount (look for $ or numbers)
  const amountMatch = lowerInput.match(/\$?([\d,]+\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  // Find matching perk
  let perkName = null;
  for (const [key, name] of Object.entries(PERK_MAPPINGS)) {
    if (lowerInput.includes(key)) {
      perkName = name;
      break;
    }
  }

  // Extract quarter/period if mentioned
  const quarterMatch = lowerInput.match(/q([1-4])/i);
  const quarter = quarterMatch ? parseInt(quarterMatch[1]) : null;

  return { amount, perkName, quarter };
}

async function findPerk(perkName, quarter = null) {
  try {
    // Fetch all perks for the user
    const response = await axios.get(`${MAXPOINTS_API}/perks?userId=${USER_ID}`);
    const perks = response.data;

    // Find matching perk
    let matchedPerk = null;

    for (const perk of perks) {
      // Check if name matches
      if (perk.name.toLowerCase().includes(perkName.toLowerCase())) {
        // If quarter is specified, check if it matches
        if (quarter) {
          const perkQuarter = Math.floor(new Date(perk.startDate).getMonth() / 3) + 1;
          if (perkQuarter === quarter) {
            matchedPerk = perk;
            break;
          }
        } else {
          // Use the current period perk
          const now = new Date();
          const start = new Date(perk.startDate || 0);
          const end = new Date(perk.endDate || '2099-12-31');

          if (now >= start && now <= end) {
            matchedPerk = perk;
            break;
          }
        }
      }
    }

    return matchedPerk;
  } catch (error) {
    console.error('Failed to fetch perks:', error.message);
    return null;
  }
}

async function logUsage(perkId, amount, notes = '') {
  try {
    const response = await axios.post(`${MAXPOINTS_API}/usage`, {
      userId: USER_ID,
      perkId: perkId,
      amount: amount,
      notes: notes
    });

    return response.data;
  } catch (error) {
    console.error('Failed to log usage:', error.message);
    throw error;
  }
}

// OpenClaw skill interface
module.exports = {
  name: 'maxpoints-usage-logger',
  description: 'Log credit card perk usage with natural language',

  // Handle user commands
  async handle(context, input) {
    // Parse the input
    const { amount, perkName, quarter } = parseUsageInput(input);

    if (!amount || !perkName) {
      return {
        success: false,
        message: 'Please specify both an amount and perk name. Example: "used $50 lululemon"'
      };
    }

    // Find the matching perk
    const perk = await findPerk(perkName, quarter);

    if (!perk) {
      return {
        success: false,
        message: `Could not find perk matching "${perkName}". Try: resy, lululemon, saks, uber, etc.`
      };
    }

    // Check if usage would exceed limit
    const remaining = perk.maxValue - (perk.currentUsage || 0);
    if (amount > remaining) {
      return {
        success: false,
        message: `Cannot log $${amount}. Only $${remaining} remaining for ${perk.name}`
      };
    }

    // Log the usage
    try {
      await logUsage(perk.id, amount, `Logged via OpenClaw: ${input}`);

      return {
        success: true,
        message: `✅ Logged $${amount} for ${perk.name}. $${remaining - amount} remaining.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to log usage: ${error.message}`
      };
    }
  },

  // Command patterns this skill responds to
  patterns: [
    'used $* *',
    'spent $* on *',
    'log $* for *',
    'add $* to *',
    '* credit $*'
  ]
};