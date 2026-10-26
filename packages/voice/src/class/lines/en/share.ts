import type { LinePack } from '../../types';

/**
 * The note home a finish can be shared as: who did what today, then how long it had waited. He
 * writes it as a teacher writes in the sổ liên lạc, dry and formal, and only ever on a note the
 * user chose to share.
 */
export const share: Pick<LinePack, 'shareNoteDone' | 'shareNoteWaited' | 'shareNoteSameDay'> = {
  shareNoteDone: [
    'Dear parents of {name}. Today your child did this: {task}.',
    'Dear parents of {name}. Finished today, in my class: {task}.',
    'To the parents of {name}. Today’s work: {task}. Done.',
  ],
  shareNoteWaited: [
    'It had waited {waited}. I have no complaints at this time.',
    'It had been on the board for {waited}. No complaints at this time.',
    'It waited {waited}. I have nothing further to report.',
  ],
  shareNoteSameDay: [
    'It was set and done the same day. I have no complaints at this time.',
    'It did not sit on the board. No complaints at this time.',
    'It did not wait. I have nothing further to report.',
  ],
};
