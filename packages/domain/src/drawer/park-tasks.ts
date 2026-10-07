import type { DrawerItemRow, Id, IsoDate, TaskRow } from '../contracts';
import { addDays, isoFromInstant, type Instant } from '../day';

import { fadeDateFor, returnDateFor, sameThing } from './drawer-items';

export interface ParkTasksInput {
  readonly drawer: readonly DrawerItemRow[];
  readonly tasks: readonly TaskRow[];
  readonly today: IsoDate;
  readonly now: Instant;
}

/**
 * The drawer after tasks are put into it whole. Each task's item carries the task's own id, which
 * is how its row and its monster are found again when it is swapped back in. An item already
 * there for the same thing is replaced by the task's, keeping the earlier of their first mentions
 * and a date either of them had. A dated one comes back on its day, never sooner than tomorrow:
 * it has just been set down, and is not handed straight back. An undated one fades.
 */
export function parkTasks(input: ParkTasksInput): {
  readonly drawer: DrawerItemRow[];
  readonly replacedIds: Id[];
} {
  const tomorrow = addDays(input.today, 1);
  let drawer = [...input.drawer];
  const replacedIds: Id[] = [];
  for (const task of input.tasks) {
    const same = drawer.filter((item) => item.id !== task.id && sameThing(item.text, task.text));
    replacedIds.push(...same.map((item) => item.id));
    drawer = drawer.filter((item) => item.id !== task.id && !same.includes(item));
    const dueDate = task.dueDate ?? same.find((item) => item.dueDate !== null)?.dueDate ?? null;
    const back = dueDate === null ? null : returnDateFor(dueDate, input.today);
    const firsts = [task.firstMentionedOn, ...same.map((item) => item.firstMentionedOn)];
    drawer.push({
      id: task.id,
      text: task.text,
      screen: task.screen,
      dueDate,
      firstMentionedOn: firsts.reduce((first, one) => (one < first ? one : first)),
      lastMentionedOn: input.today,
      returnOn: back === null ? null : back > tomorrow ? back : tomorrow,
      fadesOn: dueDate === null ? fadeDateFor(input.today) : null,
      createdAt: isoFromInstant(input.now),
    });
  }
  return { drawer, replacedIds };
}
