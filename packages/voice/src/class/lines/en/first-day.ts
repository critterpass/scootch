import type { LinePack } from '../../types';

/** The first day, and coming back. */
export const firstDay: Pick<
  LinePack,
  | 'firstDayClass'
  | 'firstDaySit'
  | 'rollCallAsk'
  | 'rollCallRepeat'
  | 'notesHomeAsk'
  | 'notesHomeExample'
  | 'notesHomeNotNow'
  | 'firstDayEmptyDesk'
  | 'comingBack'
> = {
  firstDayClass: ['Class 11A. Students: 1.'],
  firstDaySit: ['Sit.'],
  rollCallAsk: [
    'Your full name, for the roll.',
    'Full name. For the register.',
    'Name, please. All of it.',
  ],
  rollCallRepeat: [
    '{name}. I’ll remember it.',
    '{name}. Noted. I do not forget names.',
    '{name}. Good. I will remember.',
  ],
  notesHomeAsk: [
    'I write notes home. May I?',
    'Notes home. Short ones. May I?',
    'I would like to send notes home. May I?',
  ],
  notesHomeExample: [
    'The {task} is still on the desk. So is my tea.',
    'The {task}. I am still holding the ruler.',
    'The {task}. Two minutes, whenever you are ready.',
  ],
  notesHomeNotNow: [
    'Fine. I’ll keep them in my pocket.',
    'Understood. The desk works the same.',
    'Not now. I can wait. It is my job.',
  ],
  firstDayEmptyDesk: ['Your desk is clear. What have you been avoiding?'],
  comingBack: ['Sit.'],
};
