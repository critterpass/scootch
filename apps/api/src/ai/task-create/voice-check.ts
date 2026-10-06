import type { Attitude, HeardDeadline, Language } from '@scootch/domain';
import {
  checkTaskCopy,
  offlineLine,
  offlinePacks,
  type OfflineSlot,
  type TaskCopy,
  type TaskLineFailure,
} from '@scootch/voice';

import { notificationCount } from './prompt';
import type { WriterOutput } from './schema';

const fewestWorkingLines = 3;
const mostWorkingLines = 8;

/** A generation's lines in the contract's shape, cut to the counts the attitude allows. */
export function copyFrom(
  output: WriterOutput,
  deadlines: readonly HeardDeadline[],
  attitude: Attitude,
): TaskCopy {
  return {
    monster: output.monster,
    lines: { ...output.lines, working: output.lines.working.slice(0, mostWorkingLines) },
    notifications: output.notifications
      .slice(0, notificationCount(attitude))
      .map((text) => ({ text })),
    deadlines,
  };
}

/** Every line of a generation that fails the voice check: where and why, never the text. */
export function failuresIn(copy: TaskCopy, language: Language, attitude: Attitude) {
  return checkTaskCopy(copy, language, attitude);
}

/**
 * The copy with each failing line replaced by an offline line for the same slot, and the working
 * lines topped up to the fewest a session needs. The result always passes the check.
 */
export function withOfflineLines(
  copy: TaskCopy,
  failures: readonly TaskLineFailure[],
  language: Language,
  attitude: Attitude,
): TaskCopy {
  const pack = offlinePacks[language];
  const failed = new Set(failures.map(({ slot }) => slot));
  const line = (slot: OfflineSlot, text: string, index = 0, path = `lines.${slot}`) =>
    failed.has(path) ? offlineLine(language, attitude, slot, index) : text;

  const working = copy.lines.working.map((text, index) =>
    line('working', text, index, `lines.working.${index}`),
  );
  for (let index = 0; working.length < fewestWorkingLines; index += 1) {
    const spare = offlineLine(language, attitude, 'working', index);
    if (!working.includes(spare)) working.push(spare);
  }

  return {
    monster: {
      name: failed.has('monster.name') ? pack.monsterNames[0] : copy.monster.name,
      title: failed.has('monster.title') ? pack.monsterTitles[0] : copy.monster.title,
      flavourText: line('flavourText', copy.monster.flavourText, 0, 'monster.flavourText'),
    },
    lines: {
      hatch: line('hatch', copy.lines.hatch),
      start: line('start', copy.lines.start),
      working,
      pickedUp: line('pickedUp', copy.lines.pickedUp),
      checkIn: line('checkIn', copy.lines.checkIn),
      tinyNextStep: line('tinyNextStep', copy.lines.tinyNextStep),
      twoMinutesLeft: line('twoMinutesLeft', copy.lines.twoMinutesLeft),
      timeUp: line('timeUp', copy.lines.timeUp),
      caught: line('caught', copy.lines.caught),
      notFinished: line('notFinished', copy.lines.notFinished),
    },
    notifications: copy.notifications.map(({ text }, index) => ({
      text: line('notification', text, index, `notifications.${index}`),
    })),
    deadlines: copy.deadlines.map((deadline, index) =>
      failed.has(`deadlines.${index}.line`)
        ? { ...deadline, line: pack.deadline(attitude, deadline.text, deadline.heardAs) }
        : deadline,
    ),
  };
}
