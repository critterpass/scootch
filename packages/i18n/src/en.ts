/**
 * English interface strings, and the source of the key set. Lines Thầy Phú speaks never go here:
 * they come from the AI routes or from `packages/voice/offline/`.
 */
export const en = {
  'brand.name': "Phu's Class",

  // The desk.
  'desk.sit': 'Sit.',

  // Helplines: the days, hours and zones their opening times are written in.
  'care.day.fri': 'Fri',
  'care.day.mon': 'Mon',
  'care.day.sat': 'Sat',
  'care.day.sun': 'Sun',
  'care.day.thu': 'Thu',
  'care.day.tue': 'Tue',
  'care.day.wed': 'Wed',
  'care.helpline.closedNow': 'Closed right now. Hours: {hours}',
  'care.helpline.forChildren': 'For children and the people caring for them',
  'care.helpline.hours.always': 'Open day and night, every day',
  'care.helpline.hours.dayRange': '{first} to {last}',
  'care.helpline.hours.everyDay': 'Every day',
  'care.helpline.hours.weekly': '{days}, {from} to {to}, {zone}',
  'care.helpline.zone.vietnam': 'Vietnam time',
} as const;
