import type { LinePack } from '../../types';

/** Care, and the night. */
export const care: Pick<
  LinePack,
  'seriousCompany' | 'seriousBeFunny' | 'crisis' | 'crisisCompany' | 'standBy'
> = {
  seriousCompany: [
    'That’s a heavy one. No clock today.',
    'I’m here. Take your time.',
    'We can just sit.',
    'One small step when you are ready. Or none.',
    'No rush. I’ll stay.',
    'Whatever you need. I’m here.',
  ],
  seriousBeFunny: ['Understood. Back to normal.', 'All right. As you were.', 'As you wish.'],
  crisis: [],
  crisisCompany: ['I’m here.', 'Take your time. I’m staying.', 'No rush. I’m right here.'],
  standBy: ['Go to sleep.'],
};
