import type { LinePack } from '../../types';

/** A period. */
export const session: Pick<
  LinePack,
  'drumStart' | 'start' | 'looksUp' | 'raiseHand' | 'strayThought' | 'timeUp'
> = {
  drumStart: ['Tùng! Tùng! Tùng!'],
  start: [
    '{minutes} minutes. Begin.',
    'Pens up. {minutes} minutes.',
    '{minutes} minutes. I’ll be grading.',
    'Begin. I’ll be over here.',
  ],
  looksUp: [
    'I saw that.',
    'Eyes on your own paper.',
    'Is that a phone under the desk?',
    'Mm.',
    'Carry on.',
    'I’m grading. You’re working.',
    'I can hear the pen. Good.',
    'Focus.',
  ],
  raiseHand: [
    'Yes? Do the smallest first piece.',
    'Open it. That is the whole next step.',
    'Write one sentence. Any sentence.',
    'Find the first thing you need. Just that.',
    'Smaller. What are the first two minutes of the {task}?',
    'Say the first step out loud. Then do it.',
  ],
  strayThought: [
    'On the board. Eyes back here.',
    'Board. Back to work.',
    'Written up. Carry on.',
    'It’s on the board. Not now.',
  ],
  timeUp: ['Tùng tùng tùng. Done?'],
};
