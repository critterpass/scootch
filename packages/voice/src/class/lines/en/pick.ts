import type { LinePack } from '../../types';

/** Why a task is on the desk, and hearing one. */
export const pick: Pick<
  LinePack,
  | 'pickDueToday'
  | 'pickWaitedLongest'
  | 'pickSlippedMost'
  | 'pickFitsTime'
  | 'swapAllowed'
  | 'firstThingToDesk'
  | 'deadlineHeard'
  | 'timeHeard'
  | 'writtenDown'
  | 'shortTap'
> = {
  pickDueToday: [
    'Due today. It goes first.',
    'This one is due today. No debate.',
    'Today is its day. So, today.',
    'Due today. The calendar has spoken.',
  ],
  pickWaitedLongest: [
    'This one has waited the longest. Its turn.',
    'Oldest on the board. Seniority counts.',
    'It was here before my tea. It goes first.',
    'The longest wait gets the desk.',
  ],
  pickSlippedMost: [
    'Most tally marks on the board. Your desk.',
    'This one has collected the most excuses.',
    'It has more tally marks than I have hair.',
    'Most slips. Let us see it without one.',
  ],
  pickFitsTime: [
    '{minutes} minutes free. This fits.',
    'You have {minutes} minutes. So does this.',
    'This fits in {minutes} minutes. I measured.',
  ],
  swapAllowed: [
    'Fine. The {task}, then.',
    'A swap. Allowed.',
    'Your choice. I’ll pretend I agree.',
    'The {task}. The other one can wait.',
    'Swapped. My order was better.',
  ],
  firstThingToDesk: [
    'First thing said. Straight to the desk.',
    '{task}. On the desk.',
    'First one in. It sits at the front.',
  ],
  deadlineHeard: [
    '{date}. Written in the corner.',
    'Due {date}. I’ll bring it out that day.',
    '{task}, {date}. Noted in the corner.',
    '{date}. The board will remind us both.',
  ],
  timeHeard: [
    '{time}. Class ends in time.',
    '{time}. I’ll let you out early to get ready.',
    '{time}, noted. You will leave with time to spare.',
  ],
  writtenDown: ['Written down.', 'On the board.', 'Noted.'],
  shortTap: ['Hold it, then talk.'],
};
