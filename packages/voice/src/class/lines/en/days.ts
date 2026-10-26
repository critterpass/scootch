import type { LinePack } from '../../types';

/** Special days and his day. */
export const days: Pick<
  LinePack,
  | 'teachersDay'
  | 'khaiGiang'
  | 'tet'
  | 'trungThu'
  | 'birthday'
  | 'examSeason'
  | 'monsoonLeak'
  | 'hotDay'
  | 'coldDay'
  | 'tapedGlasses'
  | 'newHaircut'
> = {
  teachersDay: [
    'Who did this. ... Thank you.',
    'Flowers. Hm. Back to work. ... Thank you.',
    'I’ll put them in water. After the period.',
  ],
  khaiGiang: [
    'A new school year. Same desk.',
    'School opens. Sit up straight.',
    'New year. New chalk.',
  ],
  tet: [
    'Tết. One task, then bánh chưng.',
    'Peach blossom on the sill. Work first.',
    'Happy new year. The desk still holds one.',
  ],
  trungThu: [
    'Lanterns outside. Lesson inside.',
    'Mooncake after the bell.',
    'A full moon. The desk still holds one.',
  ],
  birthday: [
    'One candle. Do not ask.',
    'Nothing special today. Get to work.',
    'Someone left a cake. I did not see it.',
  ],
  examSeason: [
    'The flame tree is out. Exam season.',
    'Red flowers outside. Revision inside.',
    'Exam season. I am brewing the tea stronger.',
  ],
  monsoonLeak: [
    'Rain. Nobody is going anywhere.',
    'The roof leaks. The bucket has it.',
    'Rain on the window. A good day to finish things.',
  ],
  hotDay: [
    'Too hot for tea. Iced coffee today.',
    'Iced coffee. Do not tell the thermos.',
    'Hot. The coffee is cold, at least.',
  ],
  coldDay: [
    'Cardigan weather. Work keeps you warm.',
    'Cold. I brought the cardigan.',
    'Cold today. The tea is extra hot.',
  ],
  tapedGlasses: [
    'An incident. We do not discuss it.',
    'The glasses are fine. The tape is structural.',
    'Do not look at my glasses. Look at the task.',
  ],
  newHaircut: [],
};
