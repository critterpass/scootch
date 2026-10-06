import type { ContextWord } from './types';

const thing =
  "the|a|an|your|my|his|her|its|their|our|this|that|these|those|you|me|it|him|them|us|every|each|some|one|two|three|[\\p{L}]+'s";

/**
 * English words that are banned for what they say about the user, and fine as plain description:
 * "you're behind" against "behind the sofa", "late again" against "the late fee".
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
];
