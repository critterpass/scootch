import { linesEn } from './lines/en';
import { linesVi } from './lines/vi';
import type { ClassLanguage, LinePack, Moment, Placeholder } from './types';

export const linePacks: Readonly<Record<ClassLanguage, LinePack>> = { en: linesEn, vi: linesVi };

/** FNV-1a, 32 bits: a stable number for a seed, the same on every phone. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/**
 * The index of the variant to say, from `count` variants. The same seed always gives the same
 * index, and the index is never `last` when there is any other variant to give. Returns -1 when
 * there is nothing to say.
 */
export function chooseIndex(
  count: number,
  moment: Moment,
  seed: string | number,
  last?: number,
): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const value = hash(`${moment}:${seed}`);
  if (last === undefined || last < 0 || last >= count) return value % count;
  // Pick among the others, then step over the last one.
  const other = value % (count - 1);
  return other >= last ? other + 1 : other;
}

export type FillValues = Partial<Record<Placeholder, string | number>>;

/** The full name, shouted: "Trần Minh Anh" becomes "TRẦN. MINH. ANH" (the line adds the last stop). */
export function shoutName(fullName: string): string {
  return fullName.trim().split(/\s+/).join('. ').toLocaleUpperCase('vi');
}

/**
 * The line with its placeholders filled. `{NAME}` comes from `name` when no shouted form is
 * given. A placeholder with no value is left as written, so a missing value shows in tests.
 */
export function fillLine(text: string, values: FillValues): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (key === 'NAME') {
      const full = values.NAME ?? values.name;
      return full === undefined ? whole : shoutName(String(full));
    }
    const value = values[key as Placeholder];
    return value === undefined ? whole : String(value);
  });
}

export type ChosenLine = { readonly text: string; readonly index: number };

/**
 * Remembers the last variant said for each moment, so the same line never comes twice in a row.
 * The memory is plain data, so the app can keep it across launches.
 */
export function createChooser(language: ClassLanguage, last: Partial<Record<Moment, number>> = {}) {
  const memory: Partial<Record<Moment, number>> = { ...last };
  return {
    /** A line for the moment, or undefined for a moment where he says nothing. */
    say(moment: Moment, seed: string | number, values: FillValues = {}): ChosenLine | undefined {
      const variants: readonly string[] = linePacks[language][moment];
      const index = chooseIndex(variants.length, moment, seed, memory[moment]);
      const line = variants[index];
      if (line === undefined) return undefined;
      memory[moment] = index;
      return { text: fillLine(line, values), index };
    },
    /** What to keep, to carry the memory over. */
    memory(): Readonly<Partial<Record<Moment, number>>> {
      return { ...memory };
    },
  };
}
