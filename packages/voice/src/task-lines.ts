import type {
  Attitude,
  DayNotification,
  HeardDeadline,
  Language,
  MonsterCopy,
  SessionLinePack,
} from '@scootch/domain';

import { checkLine, type CheckReason, type LineKind } from './check';

/** The parts of a task call's answer that Scootch says, as opposed to the user's own tasks. */
export type TaskCopy = {
  readonly monster: MonsterCopy;
  readonly lines: SessionLinePack;
  readonly notifications: readonly DayNotification[];
  readonly deadlines: readonly HeardDeadline[];
};

/** One line with the place it sits in the answer, such as `lines.working.2`. */
export type TaskLine = { readonly slot: string; readonly kind: LineKind; readonly text: string };

/** A line that failed the voice check: where it sits and why, never what it said. */
export type TaskLineFailure = {
  readonly slot: string;
  readonly kind: LineKind;
  readonly reasons: readonly CheckReason[];
};

/** Every line and name of a task call's answer, in a fixed order. */
export function taskLines({ monster, lines, notifications, deadlines }: TaskCopy): TaskLine[] {
  const { working, tinierNextSteps = [], ...single } = lines;
  const tinierKinds = ['tinierNextStep', 'tiniestNextStep'] as const;
  return [
    { slot: 'monster.name', kind: 'monsterName', text: monster.name },
    { slot: 'monster.title', kind: 'monsterTitle', text: monster.title },
    { slot: 'monster.flavourText', kind: 'flavourText', text: monster.flavourText },
    ...Object.entries(single).flatMap(([slot, text]): TaskLine[] =>
      text === undefined ? [] : [{ slot: `lines.${slot}`, kind: slot as LineKind, text }],
    ),
    ...working.map((text, index): TaskLine => ({
      slot: `lines.working.${index}`,
      kind: 'working',
      text,
    })),
    ...tinierNextSteps.map((text, index): TaskLine => ({
      slot: `lines.tinierNextSteps.${index}`,
      kind: tinierKinds[index] ?? 'tiniestNextStep',
      text,
    })),
    ...notifications.map(({ text }, index): TaskLine => ({
      slot: `notifications.${index}`,
      kind: 'notification',
      text,
    })),
    ...deadlines.map(({ line }, index): TaskLine => ({
      slot: `deadlines.${index}.line`,
      kind: 'deadline',
      text: line,
    })),
  ];
}

/**
 * Runs the voice check on every line and name of a task call's answer. `treat` is the treat the
 * answer was asked with, when there was one.
 */
export function checkTaskCopy(
  copy: TaskCopy,
  language: Language,
  attitude: Attitude,
  treat?: string,
): TaskLineFailure[] {
  return taskLines(copy).flatMap(({ slot, kind, text }) => {
    const { ok, reasons } = checkLine({
      text,
      kind,
      language,
      attitude,
      ...(treat === undefined ? {} : { treat }),
    });
    return ok ? [] : [{ slot, kind, reasons }];
  });
}
