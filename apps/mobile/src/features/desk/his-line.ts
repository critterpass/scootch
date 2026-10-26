import {
  chooseIndex,
  fillLine,
  linePacks,
  type ClassLanguage,
  type FillValues,
  type Moment,
} from '@phusclass/voice/class';

/** One line he says, and the moment it was chosen for. */
export interface HisLine {
  readonly moment: Moment;
  readonly text: string;
}

export interface LineOptions {
  /**
   * The task has not been screened yet: nothing pointed about it. Variants that name the task
   * are left out, so his line is about the wait, never about what the task is.
   */
  readonly plain?: boolean;
}

/**
 * His offline line for a moment, the same for the same seed, so a line does not change under the
 * reader while the clock ticks. `undefined` for a moment where he says nothing.
 */
export function lineFor(
  language: ClassLanguage,
  moment: Moment,
  seed: string | number,
  values: FillValues = {},
  options: LineOptions = {},
): HisLine | undefined {
  const all: readonly string[] = linePacks[language][moment];
  const usable = options.plain === true ? all.filter((one) => !one.includes('{task}')) : all;
  const variants = usable.length > 0 ? usable : all;
  const line = variants[chooseIndex(variants.length, moment, seed)];
  if (line === undefined) return undefined;
  if (line.includes('{task}') && values.task === undefined) return undefined;
  return { moment, text: fillLine(line, values) };
}

/** The words of a fixed moment (a choice's label, the comment ladder): always its one line. */
export function fixedLine(language: ClassLanguage, moment: Moment): string {
  return linePacks[language][moment][0] ?? '';
}
