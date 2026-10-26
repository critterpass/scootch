import type { LinePack } from '../../types';

/** The late slip. */
export const slip: Pick<
  LinePack,
  | 'slipAsk'
  | 'slipTooTired'
  | 'slipAfterLunch'
  | 'slipNeedSomethingFirst'
  | 'gradeWeak'
  | 'gradeSeenIt'
  | 'gradeCreative'
  | 'slipAccepted'
  | 'frontRow'
> = {
  slipAsk: ['Let’s hear it.', 'An excuse. In writing.', 'Go on. Impress me.', 'Reason?'],
  slipTooTired: [
    'Then this will be a short one.',
    'Tired. Noted. Five minutes, then.',
    'Tired is a reason for a small one.',
  ],
  slipAfterLunch: [
    'Lunch was at noon.',
    'After lunch. Which lunch?',
    'Lunch is a meal, not a plan.',
  ],
  slipNeedSomethingFirst: [
    'Name it. Then start.',
    'Get it. Come straight back.',
    'What, exactly? Name it.',
  ],
  gradeWeak: ['Weak.', 'Thin.', 'Weak. Next excuse.'],
  gradeSeenIt: ['Seen it.', 'Seen it. 1998.', 'I have this one framed.'],
  gradeCreative: ['Creative. Still no.', 'Original. Still no.', 'Well written. Still no.'],
  slipAccepted: ['Accepted.'],
  frontRow: ['Five slips. Front row tomorrow.'],
};
