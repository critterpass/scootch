import type { IsoDate } from './moment';
import { isOpen, type Task } from './task';

/**
 * He remarks on the board when it holds more than this many open tasks. Twelve is about what fits
 * on the chalkboard in two columns before it has to be scrolled.
 */
export const LONG_BOARD_OVER = 12;

/**
 * "This is a semester, not a Tuesday." At most once a day, when the board runs long. Never while
 * a crisis task is on the board or a heavy task is on the desk.
 */
export function longBoardRemark(
  tasks: readonly Task[],
  today: IsoDate,
  lastRemarkedOn: IsoDate | null,
): 'long board' | null {
  if (lastRemarkedOn === today) return null;
  const open = tasks.filter(isOpen);
  if (open.length <= LONG_BOARD_OVER) return null;
  if (open.some((task) => task.care === 'crisis')) return null;
  if (open.some((task) => task.status === 'desk' && task.care !== 'none')) return null;
  return 'long board';
}
