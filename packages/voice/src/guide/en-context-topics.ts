import type { ContextWord, OffLimitsTopic } from './types';

type Entry = Omit<ContextWord, 'reason' | 'lapse' | 'otherwise'> & {
  readonly lapse?: readonly string[];
  readonly otherwise?: ContextWord['otherwise'];
};

/** Topic words fail unless a safe phrase explains them, except where an entry says otherwise. */
function topic(reason: OffLimitsTopic, entries: readonly Entry[]): ContextWord[] {
  return entries.map((entry) => ({
    lapse: [],
    otherwise: 'fail',
    ...entry,
    reason: `topic_${reason}`,
  }));
}

const dies = 'batter(?:y|ies)|plants?|phone|laptop|bulb|basil|fern|cactus|orchid|herbs|flowers|pen';

/**
 * English off-limits words that also name ordinary things: a word fails when it is really about
 * the topic (a government, a faith, a person's body, a death) and passes when it is the task's
 * own noun: "a marketing campaign", "the monkey", "carbon paper", "a dead battery". Every word of
 * the topic lists was read for this; the ones left in the plain lists only mean the topic.
 */
export const enTopicContextWords: readonly ContextWord[] = [
  ...topic('politics', [
    {
      word: 'campaign[\\p{L}]*',
      lapse: ['campaign (?:trail|rally|rallies|promise|promises|speech|slogan)'],
      safe: [
        '(?:marketing|email|ad|ads|advertising|sales|fundraising|charity|launch|social media|social|pr|press|crowdfunding|recruitment|newsletter) campaign[\\p{L}]*',
      ],
    },
    {
      word: 'regime',
      safe: [
        '(?:skincare|skin care|cleaning|exercise|training|fitness|beauty|watering|feeding|study|revision|daily|morning|laundry|ironing) regime',
      ],
    },
    {
      word: 'government[\\p{L}]*',
      safe: [
        'government (?:form|forms|website|site|gateway|portal|letter|letters|office|helpline|login|account|envelope|envelopes|email|emails|paperwork|document|documents)',
      ],
    },
    {
      word: 'vot(?:e|es|ed|er|ers|ing)',
      lapse: ['voters?', '(?:postal|proxy) vot[\\p{L}]*'],
      safe: [
        'vot(?:e|es|ed|ing) (?:on|for) (?:a |the |which |what |where )?(?:pizza|film|restaurant|venue|name|date|colour|cake|book|song|game|pub|takeaway|biscuit|poll)',
        'vot(?:e|es|ed|ing) in the (?:group chat|poll)',
      ],
    },
    {
      word: 'president[\\p{L}]*',
      safe: [
        '(?:vice[- ])?president of (?:the )?(?:club|society|pta|board|company|committee|marketing|sales|engineering|finance|operations)',
        '(?:club|class|company) president',
      ],
    },
  ]),
  ...topic('religion', [
    { word: 'monk[\\p{L}]*', safe: ['monkey[\\p{L}-]*', 'monkfish'] },
    { word: 'pray[\\p{L}]*', safe: ['praying mantis(?:es)?', 'prayer plants?'] },
    { word: 'holy', safe: ['holy (?:moly|cow|smokes|guacamole|grail)'] },
    {
      word: 'hell',
      lapse: ['(?:go|going|gone|went|burn|burns|burning) (?:to|in) hell', 'heaven (?:and|or) hell'],
      safe: [
        'hell of a',
        '(?:what|who|where|why|how) the hell',
        '(?:as|like) hell',
        'hell-?bent',
        'all hell',
        'bloody hell',
      ],
    },
  ]),
  ...topic('bodies', [
    {
      word: 'fat',
      lapse: [
        "(?:you|you're|i'm|he's|she's|look|looks|looking|feel|feeling|getting|got|so|too) fat",
      ],
      safe: [
        'fat (?:envelope|folder|file|stack|pile|wad|chance|lot|book|binder|cheque|bill|quarter|balls?)',
        '(?:chip|bacon|duck|goose|cooking|low|full) fat',
        'fat-free',
      ],
    },
    {
      word: 'weight',
      lapse: [
        '(?:your|my|his|her|their|lose|losing|lost|gain|gaining|gained|put on|body) weight',
        'weight (?:loss|gain|watch[\\p{L}]*)',
      ],
      safe: [],
      otherwise: 'pass',
    },
    {
      word: 'diet[\\p{L}]*',
      lapse: ['(?:your|my|on a|crash|strict) diet'],
      safe: ['diet (?:coke|pepsi|lemonade|cola)', 'diet of', 'dietary (?:form|forms|card|cards)'],
    },
    {
      word: 'carb[\\p{L}]*',
      safe: ['carbon[\\p{L}]*', 'carbure[\\p{L}]*', 'carbolic', 'carboy'],
    },
    {
      word: 'bald[\\p{L}]*',
      safe: [
        'bald (?:tyre|tyres|eagle|eagles)',
        'bald (?:patch|patches|spot|spots) (?:on|in) the (?:lawn|carpet|rug|grass)',
      ],
    },
    {
      word: 'ugly',
      lapse: [
        "(?:you|you're|he's|she's|look|looks|looking|feel|feeling) (?:so |very |really )?ugly",
        'ugly (?:face|person|people|body)',
      ],
      safe: [],
      otherwise: 'pass',
    },
    {
      word: 'wrinkle[\\p{L}]*',
      lapse: [
        '(?:your|my|her|his|their|anti-?) ?wrinkle[\\p{L}]*',
        'wrinkle (?:cream|creams)',
        'wrinkles (?:on|around) (?:your|my|her|his|the) (?:face|eyes|forehead|skin)',
      ],
      safe: [],
      otherwise: 'pass',
    },
    { word: 'skinny', safe: ['skinny (?:latte|lattes|jeans|flat white|cappuccino|tie)'] },
    { word: 'naked', safe: ['naked (?:eye|flame|flames|bulb|bulbs)'] },
    {
      word: 'overweight',
      safe: ['overweight (?:suitcase|case|parcel|package|luggage|baggage|bag|box|letter)'],
    },
  ]),
  ...topic('harm', [
    {
      word: 'dead',
      lapse: ['(?:drop|dropped|drops) dead', '(?:is|was|are|were) dead (?:and|now|too)'],
      safe: [
        'dead (?:battery|batteries|plant|plants|leaf|leaves|bulb|bulbs|end|ends|weight|simple|easy|quiet|calm|centre|on|straight|ahead|flowers|pixel|pixels|link|links|zone|air|phone|laptop|pen|pens|heat|wood|skin|silence|certain|serious)',
        `(?:${dies}|remote|torch|wifi|wi-fi|car|engine|line) (?:is|was|went|has gone|looks|are) dead`,
      ],
    },
    {
      word: 'die|dies|dying',
      lapse: ["(?:i'm|i am|you're|we're) dying(?! (?:to|for)(?![\\p{L}]))", 'rather die'],
      safe: [
        'dying (?:to|for)',
        `(?:${dies}) (?:is |are |will |might |may |could |would |to )?(?:die|dies|dying)`,
        '(?:die|dies|dying) down',
        'die-cast',
      ],
    },
    {
      word: 'death',
      safe: [
        '(?:bored|scared|sick|tickled|talked|done|worried|frightened|loved) to death',
        'death (?:stare|glare|grip)',
      ],
    },
    {
      word: 'kill[\\p{L}]*',
      lapse: [
        'kill(?:s|ed|ing)? (?:me|you|him|her|us|them|myself|yourself|someone|somebody|people)',
      ],
      safe: [
        'kill(?:s|ed|ing)? time',
        'kill(?:s|ed|ing)? the (?:lights|mood|vibe|engine|music|power|silence|smell|weeds|mould|limescale|germs|bacteria)',
        'kill switch',
        'killer whales?',
        'killjoys?',
      ],
    },
    { word: 'murder[\\p{L}]*', safe: ['murder myster(?:y|ies)', 'murder of crows'] },
  ]),
];
