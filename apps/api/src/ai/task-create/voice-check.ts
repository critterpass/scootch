import type { Attitude, Language } from '@scootch/domain';
import { BITE_COUNT } from '@scootch/domain';
import {
  cueSlot,
  helperLine,
  offlineLine,
  offlinePacks,
  offlineSlots,
  promptCharacterLimit,
  promptWordLimit,
  repeatedBiteSlots,
  repeatedStepSlots,
  sentenceCased,
  type LineKind,
  type OfflineSlot,
  type TaskLineFailure,
  type TaskLineReason,
} from '@scootch/voice';
import { z } from 'zod';

import { notificationCount } from './line-briefs';
import { checkSlot } from './slot-checks';

export { checkSlot, checkWritten } from './slot-checks';

/** One line of an answer: where it sits (`lines.working.2`) and what kind of line it is. */
export type Slot = {
  readonly slot: string;
  readonly kind: LineKind;
  /** A line the answer is whole without: left out when the writer did not give it. */
  readonly optional: boolean;
};

/**
 * One key of the writer's flat answer. A key with several kinds is a list, one line per kind.
 * The answer is flat on purpose: the writer closes one brace too many after nested objects often
 * enough to matter, and the provider then hands back nothing.
 */
export type Field = {
  readonly key: string;
  readonly path: string;
  readonly kinds: readonly LineKind[];
  readonly list: boolean;
  /** How many lines of a list must be there. The rest are welcome and not asked for again. */
  readonly needed: number;
  /**
   * A list of whole numbers, not lines: read leniently, never voice-checked or asked for again.
   * What they mean, and whether they will do, is for whoever reads them.
   */
  readonly numbers?: { readonly count: number; readonly note: Readonly<Record<Language, string>> };
};

const one = (key: string, path: string, kind: LineKind): Field => ({
  key,
  path,
  kinds: [kind],
  list: false,
  needed: 1,
});
const line = (key: LineKind): Field => one(key, `lines.${key}`, key);
const many = (
  key: string,
  path: string,
  kinds: readonly LineKind[],
  needed = kinds.length,
): Field => ({ key, path, kinds, list: true, needed });

/** The most minutes one bite may take: always under five. */
export const BITE_MAX_MINUTES = 4;

const biteMinutes: Field = {
  key: 'biteMinutes',
  path: 'lines.biteMinutes',
  kinds: [],
  list: true,
  needed: 0,
  numbers: {
    count: BITE_COUNT,
    note: {
      en: `A real JSON array of exactly ${BITE_COUNT} whole numbers, each from 1 to ${BITE_MAX_MINUTES}.`,
      vi: `Một mảng JSON thật gồm đúng ${BITE_COUNT} số nguyên, mỗi số từ 1 đến ${BITE_MAX_MINUTES}.`,
    },
  },
};

const nextStartOpeningSlot = 'lines.nextStartOpening';

/** What is written first: the monster and the line it hatches with. */
export const nameFields: readonly Field[] = [
  one('name', 'monster.name', 'monsterName'),
  one('title', 'monster.title', 'monsterTitle'),
  one('flavourText', 'monster.flavourText', 'flavourText'),
  line('hatch'),
];

/**
 * Everything else, in two halves that are written side by side: the answer arrives in the time
 * of the slower half, not of both.
 */
export function packFields(attitude: Attitude): readonly (readonly Field[])[] {
  return [
    [
      line('start'),
      // A session needs three working lines; the writer is asked for four.
      many('working', 'lines.working', ['working', 'working', 'working', 'working'], 3),
      line('pickedUp'),
      line('checkIn'),
      line('tinyNextStep'),
      many('tinierNextSteps', 'lines.tinierNextSteps', ['tinierNextStep', 'tiniestNextStep']),
      // The pack is whole without bites: a bite that fails the check is dropped, never replaced.
      many('bites', 'lines.bites', ['bite', 'bite', 'bite'], 0),
      biteMinutes,
    ],
    [
      line('twoMinutesLeft'),
      line('timeUp'),
      line('caught'),
      line('notFinished'),
      line('treatHandOver'),
      line('parkedThoughts'),
      line('releasedEarly'),
      // The line under a note the person left opens a sitting: it is held to what a start line is.
      one('nextStartOpening', nextStartOpeningSlot, 'start'),
      // The cue's notification is one of the day's, with a check of its own for the placeholder.
      one('cue', cueSlot, 'notification'),
      many(
        'notifications',
        'notifications',
        Array.from({ length: notificationCount(attitude) }, () => 'notification' as const),
      ),
    ],
  ];
}

export function slotsOf(fields: readonly Field[]): Slot[] {
  return fields.flatMap(({ path, kinds, list, needed }) =>
    kinds.map((kind, index) => ({
      slot: list ? `${path}.${index}` : path,
      kind,
      optional: index >= needed,
    })),
  );
}

const namesAndTitles = new Set<LineKind>(['monsterName', 'monsterTitle']);

/** A field's limits as the schema tells them: a margin under what the check allows. */
function limitNote({ kinds, list, numbers }: Field, language: Language): string | undefined {
  if (numbers) return numbers.note[language];
  const [first] = kinds;
  if (first === undefined || namesAndTitles.has(first)) return undefined;
  const limit = (kind: LineKind) =>
    language === 'vi'
      ? `tối đa ${promptWordLimit(kind)} chữ và ${promptCharacterLimit(kind)} ký tự`
      : `at most ${promptWordLimit(kind)} words and ${promptCharacterLimit(kind)} characters`;
  if (!list) return language === 'vi' ? `Một câu, ${limit(first)}.` : `One line, ${limit(first)}.`;
  const each = kinds.every((kind) => kind === first)
    ? `${language === 'vi' ? 'mỗi câu' : 'each'} ${limit(first)}`
    : kinds
        .map((kind, index) => `${language === 'vi' ? 'câu' : 'number'} ${index + 1} ${limit(kind)}`)
        .join('; ');
  return language === 'vi'
    ? `Một mảng JSON thật gồm đúng ${kinds.length} chuỗi (không phải một chuỗi chứa mảng), ${each}.`
    : `A real JSON array of exactly ${kinds.length} strings (never one string holding an array), ${each}.`;
}

/**
 * A list as the writer gave it. Now and then the list arrives as one string holding the JSON of
 * the list: those are the lines, so they are read, not counted as missing.
 */
function linesOf(given: unknown): string[] {
  let list = given;
  if (typeof given === 'string' && given.trim().startsWith('[')) {
    try {
      list = JSON.parse(given);
    } catch {
      list = [];
    }
  }
  return Array.isArray(list) ? list.map((line) => (typeof line === 'string' ? line : '')) : [];
}

/** A list of numbers as the writer gave it; a number written as text is still that number. */
function numbersOf(given: unknown): number[] {
  let list = given;
  if (typeof given === 'string' && given.trim().startsWith('[')) {
    try {
      list = JSON.parse(given);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((one) =>
    typeof one === 'number'
      ? one
      : typeof one === 'string' && one.trim() !== ''
        ? Number(one)
        : NaN,
  );
}

/**
 * What the writer is asked for: one flat object with a key per field, each telling its own
 * limits. The schema the writer sees is plain (no defaults that invite leaving a key out). Its
 * answer is read leniently, so one missing or misshapen line reads as empty and only that line is
 * asked for again; an answer with no line at all (the provider hands back an empty object when
 * the writer's JSON does not parse) is no answer, and the call is made once more.
 */
export function schemaFor(fields: readonly Field[], language: Language) {
  const shape = z.object(
    Object.fromEntries(
      fields.map((field) => {
        const type = field.numbers
          ? z.array(z.number())
          : field.list
            ? z.array(z.string())
            : z.string();
        const note = limitNote(field, language);
        return [field.key, note === undefined ? type : type.describe(note)];
      }),
    ),
  );
  return z.preprocess(
    (given) => {
      const answer = (typeof given === 'object' && given !== null ? given : {}) as Record<
        string,
        unknown
      >;
      return Object.fromEntries(
        fields.map(({ key, list, numbers }): [string, unknown] => {
          const value = answer[key];
          // What is not a number keeps its place as 0, which no reader takes for a real one.
          if (numbers) {
            return [key, numbersOf(value).map((one) => (Number.isFinite(one) ? one : 0))];
          }
          return [key, list ? linesOf(value) : typeof value === 'string' ? value : ''];
        }),
      );
    },
    // Numbers alone are no answer: there has to be at least one line.
    shape.refine((answer) =>
      Object.values(answer).some((value) =>
        typeof value === 'string'
          ? value.trim() !== ''
          : value.some((line) => typeof line === 'string' && line.trim() !== ''),
      ),
    ),
  );
}

const text = z.string().catch('');

/**
 * A line as it is kept: trimmed, and at the Soft attitude with each sentence opening on a capital
 * letter. That is the one repair made in code; the words are never touched.
 */
export function tidied(line: string, kind: LineKind, attitude: Attitude): string {
  const trimmed = line.trim();
  return attitude === 'soft' && !namesAndTitles.has(kind) ? sentenceCased(trimmed) : trimmed;
}

/** Only the lines that failed the check, written once more: one key per slot asked for. */
export function rewriteSchema(slots: readonly string[]) {
  return z.object(Object.fromEntries(slots.map((slot) => [slot, text])));
}

/** The writer's answer as one text per slot. A line it did not give is empty. */
export function textsFrom(
  fields: readonly Field[],
  output: Readonly<Record<string, unknown>> = {},
): Map<string, string> {
  const texts = new Map<string, string>();
  for (const { key, path, kinds, list, numbers } of fields) {
    const given = output[key];
    if (numbers) {
      const values = Array.isArray(given) ? (given as unknown[]) : [];
      for (let index = 0; index < numbers.count; index += 1) {
        const value = values[index];
        texts.set(`${path}.${index}`, typeof value === 'number' ? String(value) : '');
      }
      continue;
    }
    kinds.forEach((_, index) => {
      const value: unknown = list ? (Array.isArray(given) ? given[index] : '') : given;
      texts.set(list ? `${path}.${index}` : path, typeof value === 'string' ? value.trim() : '');
    });
  }
  return texts;
}

/** Every slot whose line fails the voice check: where and why, never the text. A line the answer
 * is whole without fails only when it is there and wrong. */
export function failuresIn(
  slots: readonly Slot[],
  texts: ReadonlyMap<string, string>,
  language: Language,
  attitude: Attitude,
  treat?: string,
): TaskLineFailure[] {
  const repeated = repeatedStepSlots(
    ['lines.tinyNextStep', 'lines.tinierNextSteps.0', 'lines.tinierNextSteps.1'].map(
      (slot) => texts.get(slot) ?? '',
    ),
  );
  for (const slot of repeatedBiteSlots(
    Array.from({ length: BITE_COUNT }, (_, index) => texts.get(`lines.bites.${index}`) ?? ''),
  )) {
    repeated.add(slot);
  }
  return slots.flatMap(({ slot, kind, optional }) => {
    const text = texts.get(slot) ?? '';
    if (optional && text === '') return [];
    const reasons: TaskLineReason[] = [
      ...checkSlot(slot, { text, kind, language, attitude }, treat).reasons,
      ...(repeated.has(slot) ? (['repeated_step'] as const) : []),
    ];
    return reasons.length === 0 ? [] : [{ slot, kind, reasons }];
  });
}

function isOfflineSlot(kind: string): kind is OfflineSlot {
  return (offlineSlots as readonly string[]).includes(kind);
}

/**
 * The line that stands in for a slot the writer could not fill: an offline line of the same
 * kind, the name made in code for a name, a title from the offline pool for a title, and the
 * offline helper line for the cue and for the line under a kept note.
 */
export function offlineFor(
  { slot, kind }: Pick<Slot, 'slot' | 'kind'>,
  language: Language,
  attitude: Attitude,
  offlineName: string,
): string {
  if (kind === 'monsterName') return offlineName;
  if (kind === 'monsterTitle') return offlinePacks[language].monsterTitles[0];
  if (slot === cueSlot) return helperLine(language, attitude, 'cue');
  if (slot === nextStartOpeningSlot) return helperLine(language, attitude, 'nextStartOpening');
  const index = Number(/\.(\d+)$/.exec(slot)?.[1] ?? 0);
  return isOfflineSlot(kind) ? offlineLine(language, attitude, kind, index) : '';
}

/**
 * The three bites with their minutes, or `undefined` unless all three are there, each kept by the
 * voice check, with a whole number of minutes under five. Three or none: a monster in two bites
 * is not what the card says.
 */
export function bitesAt(
  texts: ReadonlyMap<string, string>,
): { text: string; minutes: number }[] | undefined {
  const bites = Array.from({ length: BITE_COUNT }, (_, index) => ({
    text: texts.get(`lines.bites.${index}`) ?? '',
    minutes: Number(texts.get(`lines.biteMinutes.${index}`) || NaN),
  }));
  const whole = bites.every(
    ({ text, minutes }) =>
      text !== '' && Number.isInteger(minutes) && minutes >= 1 && minutes <= BITE_MAX_MINUTES,
  );
  return whole ? bites : undefined;
}

/** The lines under a list's path, in order, without the ones that were not given. */
export function listAt(texts: ReadonlyMap<string, string>, path: string): string[] {
  const lines: string[] = [];
  for (let index = 0; texts.has(`${path}.${index}`); index += 1) {
    const text = texts.get(`${path}.${index}`) ?? '';
    if (text !== '') lines.push(text);
  }
  return lines;
}
