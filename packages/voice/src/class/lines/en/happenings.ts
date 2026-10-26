import type { LinePack } from '../../types';

/** Happenings. */
export const happenings: Pick<
  LinePack,
  | 'happeningCat'
  | 'happeningPaperPlane'
  | 'happeningPowerCut'
  | 'happeningSaoDo'
  | 'happeningPrincipal'
  | 'happeningIceCream'
  | 'happeningPopQuiz'
> = {
  happeningCat: ['Not now, Mèo.', 'Mèo. Off the papers.', 'Mèo has no homework. You do.'],
  happeningPaperPlane: [
    'Whose is this.',
    'Whose is this. Never mind.',
    'A decent fold. Back to work.',
  ],
  happeningPowerCut: [
    'Power cut. We continue.',
    'No power. We have a candle.',
    'The lights went. The task did not.',
  ],
  happeningSaoDo: [
    'Sit up. We are being inspected.',
    'The monitor is at the door. Look busy. Better, be busy.',
    'Inspection. Pens moving.',
  ],
  happeningPrincipal: ['Ahem.', 'Carry on. Nothing to see.', 'Posture. Both of us.'],
  happeningIceCream: [
    'After the bell. Maybe.',
    'I heard it too. After the bell.',
    'Ice cream is for recess.',
  ],
  happeningPopQuiz: [
    'Paper out. Fifteen minutes.',
    'Pop quiz. Fifteen-minute periods today.',
    'Paper out! Fifteen minutes. No talking.',
  ],
};
