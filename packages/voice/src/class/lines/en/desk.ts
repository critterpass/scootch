import type { LinePack } from '../../types';

/** The desk, by pressure. */
export const desk: Pick<
  LinePack,
  'pressure0' | 'pressure1' | 'pressure2' | 'pressure3' | 'pressure4' | 'pressure5'
> = {
  pressure0: [
    'Two minutes. I’ll wait.',
    'Two minutes. I have nowhere to be.',
    'Two minutes. The chalk is ready.',
    '{task}. Two minutes. I’ll wait.',
    'I’ll wait. I have thirty-two years of practice.',
    'Whenever you are ready. Within two minutes.',
    'The desk is set. So am I.',
    'Two minutes. I’ve poured the tea.',
    'One thing on the desk. Two minutes.',
  ],
  pressure1: [
    'This tea was hot when you sat down.',
    'I have poured a second cup.',
    'My tea is cooling. The {task} is not.',
    'I can drink tea all day. I would rather not.',
    'The thermos is half empty. The desk is not.',
    'Lukewarm. The tea, I mean.',
    'I am on my second cup of patience.',
    'I’m looking over my glasses. That’s a sign.',
  ],
  pressure2: [
    'We both know how this ends.',
    'It ends with you starting. Might as well.',
    'The {task} will not do itself. I checked.',
    'Arms crossed. That is the whole warning.',
    'I have crossed my arms. This is serious.',
    'Ten minutes and it is done. I would bet my tea.',
    'Hands on hips. A classic. Still works.',
    'I have read this chapter. It ends with the {task} done.',
  ],
  pressure3: [
    'Tap. Tap.',
    'Tap. Tap. Tap.',
    'The ruler is getting involved.',
    'Tap. That was the polite one.',
    'This ruler has opinions about the {task}.',
    'Tap. Tap. {task}.',
    'One. Two…',
    'I am counting. Quietly. For now.',
  ],
  pressure4: ['{NAME}.', '{NAME}. The {task}.', '{NAME}. Desk. Now.', '{NAME}. Pen. Paper. Go.'],
  pressure5: ['...'],
};
