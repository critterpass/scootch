import type { Attitude, Language } from '@scootch/domain';
import { treatPlaceholder } from '@scootch/domain';
import {
  checkLine,
  checkWrittenLine,
  offlineLine,
  offlinePacks,
  offlineSlots,
  promptCharacterLimit,
  promptWordLimit,
  repeatedStepSlots,
  sentenceCased,
  type CheckReason,
  type LineCheck,
  type LineKind,
  type OfflineSlot,
  type TaskLineFailure,
} from '@scootch/voice';
import { z } from 'zod';

import { notificationCount } from './line-briefs';

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
    ],
    [
      line('twoMinutesLeft'),
      line('timeUp'),
      line('caught'),
      line('notFinished'),
      line('treatHandOver'),
      line('parkedThoughts'),
      line('releasedEarly'),
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
function limitNote({ kinds, list }: Field, language: Language): string | undefined {
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
        const type = field.list ? z.array(z.string()) : z.string();
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
        fields.map(({ key, list }) => {
          const value = answer[key];
          return [key, list ? linesOf(value) : typeof value === 'string' ? value : ''];
        }),
      );
    },
    shape.refine((answer) =>
      Object.values(answer).some((value) =>
        typeof value === 'string' ? value.trim() !== '' : value.some((line) => line.trim() !== ''),
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

/**
 * The voice check on a line as the person will read it: the treat line is checked with the
 * treat's name in place of the placeholder when the treat is known, so its length is the real one.
 * Its sentence case is judged with the placeholder still in: the treat's letters are the person's.
 */
export function checkWritten(
  line: { text: string; kind: LineKind; language: Language; attitude: Attitude },
  treat?: string,
): LineCheck {
  if (line.kind !== 'treatHandOver' || treat === undefined) return checkWrittenLine(line);
  const filled = checkLine({
    ...line,
    text: line.text.replaceAll(treatPlaceholder, treat),
    treat,
  });
  return checkWrittenLine(line).reasons.includes('sentence_case')
    ? { ok: false, reasons: [...filled.reasons, 'sentence_case'] }
    : filled;
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
  for (const { key, path, kinds, list } of fields) {
    const given = output[key];
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
  return slots.flatMap(({ slot, kind, optional }) => {
    const text = texts.get(slot) ?? '';
    if (optional && text === '') return [];
    const reasons: CheckReason[] = [
      ...checkWritten({ text, kind, language, attitude }, treat).reasons,
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
 * kind, the name made in code for a name, a title from the offline pool for a title.
 */
export function offlineFor(
  { slot, kind }: Pick<Slot, 'slot' | 'kind'>,
  language: Language,
  attitude: Attitude,
  offlineName: string,
): string {
  if (kind === 'monsterName') return offlineName;
  if (kind === 'monsterTitle') return offlinePacks[language].monsterTitles[0];
  const index = Number(/\.(\d+)$/.exec(slot)?.[1] ?? 0);
  return isOfflineSlot(kind) ? offlineLine(language, attitude, kind, index) : '';
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
