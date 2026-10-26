import type { LinePack } from '../../types';

/** Notes home and tuition. */
export const notes: Pick<
  LinePack,
  | 'noteHome1'
  | 'noteHome2'
  | 'noteHome3'
  | 'tuitionChargeReminder'
  | 'tuitionFirstNotice'
  | 'scholarshipGranted'
  | 'winBack'
> = {
  noteHome1: [
    '{task}. Two minutes. I’ll wait.',
    'The {task} is on your desk. The tea is hot.',
    '{task}. Whenever you are ready. Soon.',
    'Your desk has one thing on it: {task}.',
    '{task}. The chalk is out.',
  ],
  noteHome2: [
    '{task}. My tea has gone cold.',
    '{task}. We both know how this ends.',
    '{task}. My arms are crossed.',
    'Still on the desk: {task}.',
    '{task}. Ten minutes and it is done.',
  ],
  noteHome3: [
    '{task}. Tap. Tap.',
    '{task}. I am still holding the ruler.',
    '{task}. The chalk is in my hand.',
    '{task}. {NAME}.',
    '{task}. Ten minutes. Now.',
  ],
  tuitionChargeReminder: [
    'A note before the bill: {price} on {date}. Cancelling is two taps in Settings.',
    'On {date}, {price} for tuition. If you are done, Settings, two taps.',
    'Tuition: {price} on {date}. To stop it, Settings. No hard feelings.',
  ],
  tuitionFirstNotice: [
    'A notice. Read it or don’t.',
    'Tuition, on the board. Ignoring it is allowed.',
    'A notice went up. I did not write it.',
  ],
  scholarshipGranted: [
    'Granted. Now there is no excuse.',
    'Granted. A full school year.',
    'Approved. The desk is ready.',
  ],
  winBack: [
    'A month on the house. Sit.',
    'Tuition, free for a month. Sit.',
    'A free month. Your desk is ready.',
  ],
};
