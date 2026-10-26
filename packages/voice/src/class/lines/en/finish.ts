import type { LinePack } from '../../types';

/** The finish, recess and partial credit. */
export const finish: Pick<
  LinePack,
  | 'commentFine'
  | 'commentGood'
  | 'commentGoodWork'
  | 'commentTen'
  | 'next'
  | 'recessOffered'
  | 'recessOver'
  | 'partialCredit'
  | 'partialAnotherPeriod'
  | 'partialBackOnBoard'
  | 'partialErase'
  | 'partialNotePrompt'
  | 'partialNoteReturns'
> = {
  commentFine: ['Fine.'],
  commentGood: ['Good.'],
  commentGoodWork: ['Good work.'],
  commentTen: [],
  next: ['Next.'],
  recessOffered: [
    'Recess. Five minutes.',
    'Recess. Stretch. Water. Window.',
    'Five minutes of recess. I’m taking my tea.',
    'Recess, if you want it.',
  ],
  recessOver: ['Tùng. Back to class.', 'Recess is over. Sit.', 'The drum. Back to your desk.'],
  partialCredit: [
    'Partial credit, then.',
    'Not yet. That is allowed.',
    'Half a page is still a page.',
  ],
  partialAnotherPeriod: ['Another period'],
  partialBackOnBoard: ['Back on the board'],
  partialErase: ['Erase it'],
  partialNotePrompt: [
    'One line for next time.',
    'Leave yourself one line. Where did you stop?',
    'Write where you stopped. One line.',
  ],
  partialNoteReturns: [
    'You left yourself a note.',
    'Your note, word for word.',
    'Read your note first.',
  ],
};
