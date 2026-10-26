import type { LinePack } from '../../types';

/** The timetable and the report card. */
export const timetable: Pick<LinePack, 'timetableAsk' | 'timetableWeekend' | 'reportCardComment'> =
  {
    timetableAsk: [
      'Let me read your calendar. I fill free periods and change nothing.',
      'Show me your calendar. I read it. I never touch it.',
      'Your calendar, please. I only read. Nothing gets changed.',
    ],
    timetableWeekend: [
      'If you want one thing: {task}.',
      'One thing, if you like: {task}.',
      'One small thing, if you want: {task}.',
    ],
    reportCardComment: [
      'Hands things in. The drum has no complaints.',
      'The desk has new carvings. My tea approves.',
      'Sits down, picks up the chalk. That is the job.',
    ],
  };
