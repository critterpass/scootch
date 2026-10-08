/**
 * English interface strings for company without strangers: the count of others in a session, its
 * switch, the times of the day and the lead before a time, and what the privacy page says of it.
 */
export const enCompany = {
  'session.othersHunting': '{number} are hunting something right now',

  'settings.othersHunting': 'Others hunting',
  'settings.othersHunting.sub': 'How many are in a session while you are',
  'settings.othersHunting.hint': 'Off shows no number, and your sessions are not counted',

  'settings.dayMoments': 'Day moments',
  'settings.dayMoments.hint': 'Opens the five times of your day',
  'settings.dayMoments.note': 'When each of these comes round in your day.',
  'settings.dayMoments.coffee': 'Coffee',
  'settings.dayMoments.lunch': 'Lunch',
  'settings.dayMoments.work': 'After work',
  'settings.dayMoments.dinner': 'Dinner',
  'settings.dayMoments.bed': 'Bed',

  'settings.dayMoments.earlier': 'Ten minutes earlier',
  'settings.dayMoments.later': 'Ten minutes later',

  'settings.getReady': 'Get ready',
  'settings.getReady.hint': 'Opens how long before a time getting ready starts',
  'settings.getReady.note': 'How long before a time you said getting ready starts.',
  'settings.getReady.minutes': '{minutes} min',
  'settings.getReady.lead': 'Before the time',
  'settings.getReady.less': 'Five minutes less',
  'settings.getReady.more': 'Five minutes more',
} as const;
