import type { Attitude, Language } from '@scootch/domain';
import {
  checkLine,
  offlineLine,
  offlinePacks,
  offlineSlots,
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

/** A missing or misshapen line reads as empty, so the check sends that one line back, not all. */
const text = z.string().catch('');

/** What the writer is asked for: one flat object with a key per field. */
export function schemaFor(fields: readonly Field[]) {
  return z.object(
    Object.fromEntries(
      fields.map(({ key, list }) => [key, list ? z.array(z.string()).catch([]) : text]),
    ),
  );
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
): TaskLineFailure[] {
  return slots.flatMap(({ slot, kind, optional }) => {
    const text = texts.get(slot) ?? '';
    if (optional && text === '') return [];
    const { ok, reasons } = checkLine({ text, kind, language, attitude });
    return ok ? [] : [{ slot, kind, reasons }];
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
