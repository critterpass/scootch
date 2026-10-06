import type { Attitude, Language } from '@scootch/domain';
import {
  checkTaskCopy,
  offlineLine,
  offlinePacks,
  offlineSlots,
  type OfflineSlot,
  type TaskCopy,
  type TaskLineFailure,
} from '@scootch/voice';

import { notificationCount } from './prompt';
import type { LinesOutput } from './schema';

const fewestWorkingLines = 3;
const mostWorkingLines = 8;

/** A generation's lines in the contract's shape, cut to the counts the attitude allows. */
export function copyFrom(output: LinesOutput, attitude: Attitude): TaskCopy {
  const { name, title, flavourText, notifications, working, ...lines } = output;
  return {
    monster: { name, title, flavourText },
    lines: { ...lines, working: working.slice(0, mostWorkingLines) },
    notifications: notifications.slice(0, notificationCount(attitude)).map((text) => ({ text })),
    deadlines: [],
  };
}

/** Every line of a generation that fails the voice check: where and why, never the text. */
export function failuresIn(copy: TaskCopy, language: Language, attitude: Attitude) {
  return checkTaskCopy(copy, language, attitude);
}

/** The copy with the lines at the given slots (`lines.hatch`, `notifications.1`) swapped. */
export function replaceLines(copy: TaskCopy, texts: ReadonlyMap<string, string>): TaskCopy {
  const at = (slot: string, text: string) => texts.get(slot) ?? text;
  const { lines, monster } = copy;
  return {
    monster: {
      name: at('monster.name', monster.name),
      title: at('monster.title', monster.title),
      flavourText: at('monster.flavourText', monster.flavourText),
    },
    lines: {
      hatch: at('lines.hatch', lines.hatch),
      start: at('lines.start', lines.start),
      working: lines.working.map((text, index) => at(`lines.working.${index}`, text)),
      pickedUp: at('lines.pickedUp', lines.pickedUp),
      checkIn: at('lines.checkIn', lines.checkIn),
      tinyNextStep: at('lines.tinyNextStep', lines.tinyNextStep),
      twoMinutesLeft: at('lines.twoMinutesLeft', lines.twoMinutesLeft),
      timeUp: at('lines.timeUp', lines.timeUp),
      caught: at('lines.caught', lines.caught),
      notFinished: at('lines.notFinished', lines.notFinished),
    },
    notifications: copy.notifications.map(({ text }, index) => ({
      text: at(`notifications.${index}`, text),
    })),
    deadlines: copy.deadlines,
  };
}

function isOfflineSlot(kind: string): kind is OfflineSlot {
  return (offlineSlots as readonly string[]).includes(kind);
}

/**
 * The copy with each failing line replaced by an offline line for the same slot, a failing name
 * by the name made in code, and the working lines topped up to the fewest a session needs. The
 * result always passes the check.
 */
export function withOfflineLines(
  copy: TaskCopy,
  failures: readonly TaskLineFailure[],
  language: Language,
  attitude: Attitude,
  offlineName: string,
): TaskCopy {
  const texts = new Map<string, string>();
  for (const { slot, kind } of failures) {
    const index = Number(/\.(\d+)$/.exec(slot)?.[1] ?? 0);
    if (kind === 'monsterName') texts.set(slot, offlineName);
    else if (kind === 'monsterTitle') texts.set(slot, offlinePacks[language].monsterTitles[0]);
    else if (isOfflineSlot(kind)) texts.set(slot, offlineLine(language, attitude, kind, index));
  }
  const replaced = replaceLines(copy, texts);

  const working = [...replaced.lines.working];
  for (let index = 0; working.length < fewestWorkingLines; index += 1) {
    const spare = offlineLine(language, attitude, 'working', index);
    if (!working.includes(spare)) working.push(spare);
  }
  return { ...replaced, lines: { ...replaced.lines, working } };
}

/** Every line from the offline pack, for when no writer answer could be used at all. */
export function offlineCopy(language: Language, attitude: Attitude, offlineName: string): TaskCopy {
  const line = (slot: OfflineSlot, index = 0) => offlineLine(language, attitude, slot, index);
  return {
    monster: {
      name: offlineName,
      title: offlinePacks[language].monsterTitles[0],
      flavourText: line('flavourText'),
    },
    lines: {
      hatch: line('hatch'),
      start: line('start'),
      working: [...offlinePacks[language].lines[attitude].working],
      pickedUp: line('pickedUp'),
      checkIn: line('checkIn'),
      tinyNextStep: line('tinyNextStep'),
      twoMinutesLeft: line('twoMinutesLeft'),
      timeUp: line('timeUp'),
      caught: line('caught'),
      notFinished: line('notFinished'),
    },
    notifications: Array.from({ length: notificationCount(attitude) }, (_, index) => ({
      text: line('notification', index),
    })),
    deadlines: [],
  };
}
