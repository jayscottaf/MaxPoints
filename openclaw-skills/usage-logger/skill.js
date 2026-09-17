const { queueSuggestion, eventId } = require('../client');

module.exports = {
  name: 'maxpoints-usage-logger',
  description: 'Queue perk usage for owner review in MaxPoints',
  async handle(context, input) {
    if (typeof input !== 'string' || !input.trim() || input.length > 4000) return { success: false, message: 'Enter a usage description of at most 4000 characters.' };
    const id = context?.messageId || context?.eventId;
    if (!id) return { success: false, message: 'A stable messageId or eventId is required to prevent duplicate usage requests.' };
    try {
      await queueSuggestion({ kind: 'usage', title: 'Usage awaiting review', message: input, eventId: eventId(`usage:${id}`) });
      return { success: true, message: 'Queued in MaxPoints Settings > Automation inbox. Usage has not been changed.' };
    } catch (error) { return { success: false, message: error.message }; }
  },
  patterns: ['used $* *', 'spent $* on *', 'log $* for *', 'add $* to *', '* credit $*']
};
