import { saidBack } from './said-back';
import type { HelperLines, OfflinePack } from './types';

/** The helper lines that are the same quiet words at every attitude. */
const quiet = {
  guessNote: 'A guess, before you start.',
  nextTimeAsk: 'Next time, start with…',
  bitesStart: 'Start with the first one.',
  bitesNext: "{count} down. Tick the next when it's done.",
  bitesLast: 'Opening the catch…',
  widgetRest: 'Nothing waiting.',
  widgetJoined: '{name} moved in.',
} as const satisfies Partial<HelperLines>;

/** The English lines around the starting helpers. */
export const enHelpers: Pick<
  OfflinePack,
  'helpers' | 'plainHelpers' | 'timeSaidBack' | 'getReady'
> = {
  helpers: {
    soft: {
      ...quiet,
      guessAsk: 'How long do you think this would take?',
      inTheWayBoring: "Boring is fair. I'll sit close and make a small fuss about it.",
      inTheWayScary: "Scary ones only need opening. Just open it, and I'm right here.",
      inTheWayConfusing:
        'Then we start with one question. Write down the one thing you need to know.',
      inTheWayTooBig: "Then we make it smaller. One small bite is all I'm asking for.",
      cue: "{cue}, you said. I'm here whenever you are.",
      timeHeardPlan: "I'll end sessions in time for you to get ready, and nudge you once.",
      nextTimeNote: "Optional. I'll show it to you first next time, word for word.",
      nextStartOpening: "You left yourself a way in. Start right there. I'm beside you.",
    },
    cheeky: {
      ...quiet,
      guessAsk: 'How long would this take?',
      inTheWayBoring: 'Boring? Good. I brought enough drama for both of us.',
      inTheWayScary: "Scary? Then we only open it. Just open it. I'll look first.",
      inTheWayConfusing:
        "Confusing? Then step one is a question. Write down the one thing you'd ask.",
      inTheWayTooBig: "Too big? Then it shrinks. One bite. I'll hold the fork.",
      cue: "{cue}, you said. I'm here.",
      timeHeardPlan: "I'll end sessions in time for you to get ready, and nudge you once.",
      nextTimeNote: "Optional. I'll show it to you first next time, word for word.",
      nextStartOpening: "Your own note, as you left it. Start there. I'll mind the monster.",
    },
    unhinged: {
      ...quiet,
      guessAsk: 'HOW LONG WOULD THIS TAKE? Guess. I am writing it down.',
      inTheWayBoring: 'BORING? EXCELLENT. I will be dramatic enough for the whole building.',
      inTheWayScary: 'SCARY. Fine. We only open it. JUST OPEN IT. I will stand in front.',
      inTheWayConfusing:
        "CONFUSING. Then step one is ONE QUESTION. Write down the one thing you'd ask.",
      inTheWayTooBig: 'TOO BIG. THEN IT SHRINKS. One bite. I own a very small fork.',
      cue: '{cue}, YOU SAID. I AM HERE. I brought a chair.',
      timeHeardPlan: 'I WILL END SESSIONS IN TIME for you to get ready, and nudge you once. ONCE.',
      nextTimeNote: 'Optional. I will show it to you first next time, WORD FOR WORD.',
      nextStartOpening: 'YOUR OWN NOTE, exactly as you left it. Start there. I am guarding it.',
    },
  },
  plainHelpers: {
    cue: "{cue}, you said. I'm here when you're ready.",
    timeHeardPlan: "I'll end sessions in time for you to get ready, and remind you once.",
    nextTimeAsk: quiet.nextTimeAsk,
    nextTimeNote: "Optional. I'll show it to you first next time, word for word.",
    nextStartOpening: "This is the note you left. We can start there. I'm here.",
  },
  timeSaidBack: saidBack,
  getReady: (heardAs) => `${saidBack(heardAs)} Time to get ready.`,
};
