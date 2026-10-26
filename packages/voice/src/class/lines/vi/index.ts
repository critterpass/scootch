import type { LinePack } from '../../types';
import { desk } from './desk';
import { pick } from './pick';
import { session } from './session';
import { finish } from './finish';
import { slip } from './slip';
import { board } from './board';
import { firstDay } from './first-day';
import { notes } from './notes';
import { happenings } from './happenings';
import { days } from './days';
import { care } from './care';
import { share } from './share';

/** Thầy Phú bằng tiếng Việt: thầy xưng thầy, gọi em. Xem `guide.vi.md`. */
export const linesVi: LinePack = {
  ...desk,
  ...pick,
  ...session,
  ...finish,
  ...slip,
  ...board,
  ...firstDay,
  ...notes,
  ...happenings,
  ...days,
  ...care,
  ...share,
};
