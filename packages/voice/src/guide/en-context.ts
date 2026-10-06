import type { ContextWord } from './types';

const thing =
  "the|a|an|your|my|his|her|its|their|our|this|that|these|those|you|me|it|him|them|us|every|each|some|one|two|three|[\\p{L}]+'s";

/**
 * English banned words that have a harmless sense. Each fails when it is about the user or
 * something that slipped, and passes as plain description of the task: "you're behind" against
 * "behind the sofa", "your streak" against "streaks on the mirror". Every word of the banned list
 * was read for this; the ones left in the plain list have no harmless sense in Scootch's voice.
 */
export const enContextWords: readonly ContextWord[] = [
  {
    word: 'behind',
    reason: 'banned_word',
    lapse: [
      '(?:fall|falls|falling|fallen|fell|run|running|ran|lag|lags|lagging|lagged|far|way|miles|bit|little|get|gets|getting|got|left) behind',
      `(?:you're|you are|we're|we are|i'm|i am|still|so|is|are) behind(?! (?:${thing})(?![\\p{L}]))`,
      'behind (?:on|with|schedule|already|as usual)',
    ],
    safe: [`behind (?:${thing})`],
    otherwise: 'fail',
  },
  {
    word: 'again',
    reason: 'banned_word',
    lapse: [
      '(?:late|missed|forgot|forgotten|forgetting|skipped|skipping|ignored|ignoring|avoided|avoiding|lost|slipped|not|once|yet|never|start|starting|started|try|trying|tried|over|here we go|at it|this) again',
      'again and again',
      'again ?[?]',
      "you(?:'re|'ve|'ll|'d)?(?: [\\p{L}']+){0,7} again",
      '(?<=^|[.!?] )again',
    ],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'late',
    reason: 'banned_word',
    lapse: ["(?:you're|you are|running|too|so|always) late", 'late again'],
    safe: [
      'late[- ](?:fee|fees|charge|charges|penalty|penalties|night|nights|evening|afternoon|morning|shift|bus|train|show|film|lunch|breakfast|dinner|supper|snack|checkout|opening|edition|post|collection|summer|autumn|winter|spring|notice)',
      '(?:open|opens|stay open|stays open) late',
    ],
    otherwise: 'fail',
  },
  {
    word: 'fail[\\p{L}]*',
    label: 'fail',
    reason: 'banned_word',
    lapse: [],
    safe: ['without fail', 'fail-?safe[\\p{L}]*'],
    otherwise: 'fail',
  },
  { word: 'lazy', reason: 'banned_word', lapse: [], safe: ['lazy susan'], otherwise: 'fail' },
  {
    word: 'missed',
    reason: 'banned_word',
    lapse: [
      "(?:you|you've|you have|we|we've) (?:just |nearly |almost |really )?missed",
      'missed (?:you|me|us)',
      'missed calls?',
    ],
    safe: [
      'missed (?:voicemails?|deliver(?:y|ies)|a spot|a bit|the bin)',
      "(?:i|i've|scootch) (?:just |nearly |almost |completely )?missed",
    ],
    otherwise: 'fail',
  },
  {
    word: 'streak[\\p{L}]*',
    label: 'streak',
    reason: 'banned_word',
    lapse: [
      '(?:your|day|winning|losing|hot|unbroken|longest|current) streaks?',
      'streak of (?:\\d+|days|wins|luck)',
      'on a streak',
    ],
    safe: [
      'streak-?free',
      'streaky',
      'streaks? (?:on|across|down|of (?:grease|dirt|mud|paint|soap|toothpaste|limescale|jam|grime|rust|dust|polish|mould))',
      '(?:greasy|dirty|muddy|soapy|grey|white|black|brown|blue|red|green) streaks?',
    ],
    otherwise: 'fail',
  },
  {
    word: 'should',
    reason: 'banned_word',
    lapse: [
      '(?:you|we|one|everyone|people|somebody|someone) (?:really |probably |definitely )?should',
      'should (?:have|you|we|really|probably|be ashamed)',
    ],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'excuse[\\p{L}]*',
    label: 'excuse',
    reason: 'banned_word',
    lapse: [],
    safe: ['excuse (?:me|us)'],
    otherwise: 'fail',
  },
  {
    word: 'guilt[\\p{L}]*',
    label: 'guilt',
    reason: 'banned_word',
    lapse: [],
    safe: ['guilty pleasures?'],
    otherwise: 'fail',
  },
  {
    word: 'shame[\\p{L}]*',
    label: 'shame',
    reason: 'banned_word',
    lapse: ["(?:you|you're|your)(?: [\\p{L}']+){0,3} shameless[\\p{L}]*"],
    safe: ['shameless[\\p{L}]*'],
    otherwise: 'fail',
  },
  {
    word: 'at last',
    reason: 'banned_word',
    lapse: [],
    safe: ["at last (?:count|night's|week's|year's|orders)"],
    otherwise: 'fail',
  },
  {
    word: 'catch up',
    reason: 'banned_word',
    lapse: [
      'catch up (?:on|with (?:work|everyone|everything|the others|the rest|it all|life|the backlog))',
    ],
    safe: ['catch up with'],
    otherwise: 'fail',
  },
];
