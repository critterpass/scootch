import {
  cuePlaceholder,
  type Attitude,
  type DayNotification,
  type HeardDeadline,
  type Language,
  type MonsterCopy,
  type SessionLinePack,
} from '@scootch/domain';

import { checkWrittenLine, type CheckReason, type LineKind } from './check';
import { repeatedSteps } from './line-rules';

/** The parts of a task call's answer that Scootch says, as opposed to the user's own tasks. */
export type TaskCopy = {
  readonly monster: MonsterCopy;
  readonly lines: SessionLinePack;
  readonly notifications: readonly DayNotification[];
  readonly deadlines: readonly HeardDeadline[];
  /** The cue's notification, on an answer that has one. */
  readonly cueNotification?: DayNotification | undefined;
};

/** Why a line of a task call's answer failed: the voice check's reasons, and the cue's own. */
export type TaskLineReason = CheckReason | 'cue_not_named';

/** One line with the place it sits in the answer, such as `lines.working.2`. */
export type TaskLine = { readonly slot: string; readonly kind: LineKind; readonly text: string };

/** A line that failed the voice check: where it sits and why, never what it said. */
export type TaskLineFailure = {
  readonly slot: string;
  readonly kind: LineKind;
  readonly reasons: readonly TaskLineReason[];
};

/** The slot of the cue's notification, which is checked with a cue in place of its placeholder. */
export const cueSlot = 'cueNotification';

/**
 * The longest thing a phone puts where a cue's line says the cue back, so the line is measured as
 * long as it can get.
 */
const longestCue: Readonly<Record<Language, string>> = {
  en: 'At 12:30 pm',
  vi: 'Trước khi đi ngủ',
};

/**
 * The check for the cue's notification. It is a notification like the day's others, read with a
 * cue where the placeholder stands, and it must open with the placeholder and hold it once: the
 * phone puts the user's own cue there as the opening of the sentence.
 */
export function checkCueLine(line: {
  readonly text: string;
  readonly language: Language;
  readonly attitude: Attitude;
}): { readonly ok: boolean; readonly reasons: readonly TaskLineReason[] } {
  const text = line.text.trim();
  const check = checkWrittenLine({
    ...line,
    kind: 'notification',
    text: text.replaceAll(cuePlaceholder, longestCue[line.language]),
  });
  if (check.reasons.includes('empty')) return check;
  const named = text.startsWith(cuePlaceholder) && text.split(cuePlaceholder).length === 2;
  return named ? check : { ok: false, reasons: [...check.reasons, 'cue_not_named'] };
}

/** Every line and name of a task call's answer, in a fixed order. */
export function taskLines({
  monster,
  lines,
  notifications,
  deadlines,
  cueNotification,
}: TaskCopy): TaskLine[] {
  const { working, tinierNextSteps = [], bites = [], nextStartOpening, ...single } = lines;
  const tinierKinds = ['tinierNextStep', 'tiniestNextStep'] as const;
  return [
    { slot: 'monster.name', kind: 'monsterName', text: monster.name },
    { slot: 'monster.title', kind: 'monsterTitle', text: monster.title },
    { slot: 'monster.flavourText', kind: 'flavourText', text: monster.flavourText },
    ...Object.entries(single).flatMap(([slot, text]): TaskLine[] =>
      text === undefined ? [] : [{ slot: `lines.${slot}`, kind: slot as LineKind, text }],
    ),
    // The line under a kept note opens a sitting, and is held to what a start line is.
    ...(nextStartOpening === undefined
      ? []
      : [{ slot: 'lines.nextStartOpening', kind: 'start' as const, text: nextStartOpening }]),
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
    ...bites.map(({ text }, index): TaskLine => ({
      slot: `lines.bites.${index}`,
      kind: 'bite',
      text,
    })),
    ...notifications.map(({ text }, index): TaskLine => ({
      slot: `notifications.${index}`,
      kind: 'notification',
      text,
    })),
    ...(cueNotification === undefined
      ? []
      : [{ slot: cueSlot, kind: 'notification' as const, text: cueNotification.text }]),
    ...deadlines.map(({ line }, index): TaskLine => ({
      slot: `deadlines.${index}.line`,
      kind: 'deadline',
      text: line,
    })),
  ];
}

/** The slots of the smaller steps that repeat the first step or one another. */
export function repeatedStepSlots(steps: readonly string[]): Set<string> {
  return new Set(repeatedSteps(steps).map((index) => `lines.tinierNextSteps.${index - 1}`));
}

/** The slots of the bites that repeat an earlier bite: three bites are three different steps. */
export function repeatedBiteSlots(bites: readonly string[]): Set<string> {
  return new Set(repeatedSteps(bites).map((index) => `lines.bites.${index}`));
}

/**
 * Runs the voice check on every line and name of a task call's answer. `treat` is the treat the
 * answer was asked with, when there was one. A smaller step that only repeats an earlier one
 * fails too, and so does a bite that repeats another, and a cue's line that does not open with
 * its placeholder.
 */
export function checkTaskCopy(
  copy: TaskCopy,
  language: Language,
  attitude: Attitude,
  treat?: string,
): TaskLineFailure[] {
  const repeated = repeatedStepSlots([
    copy.lines.tinyNextStep,
    ...(copy.lines.tinierNextSteps ?? []),
  ]);
  for (const slot of repeatedBiteSlots((copy.lines.bites ?? []).map(({ text }) => text))) {
    repeated.add(slot);
  }
  return taskLines(copy).flatMap(({ slot, kind, text }) => {
    const check =
      slot === cueSlot
        ? checkCueLine({ text, language, attitude })
        : checkWrittenLine({
            text,
            kind,
            language,
            attitude,
            ...(treat === undefined ? {} : { treat }),
          });
    const reasons: TaskLineReason[] = [
      ...check.reasons,
      ...(repeated.has(slot) ? (['repeated_step'] as const) : []),
    ];
    return reasons.length === 0 ? [] : [{ slot, kind, reasons }];
  });
}
