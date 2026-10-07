import { daysBetween, type IsoDate, type MonsterRow, type WorldPieceRow } from '@scootch/domain';

import type { Translate } from '../../i18n/i18n-provider';

import { pieceKind } from './landmarks';

const ordinary = (pieces: readonly WorldPieceRow[]) =>
  pieces.filter((piece) => pieceKind(piece) !== 'landmark');

/**
 * The day the world is read on. The phone says what today is; a drawing with no clock behind it
 * reads the world on the day its newest piece landed.
 */
export function worldDay(pieces: readonly WorldPieceRow[], today?: IsoDate): IsoDate | null {
  if (today) return today;
  const days = ordinary(pieces).map((piece) => piece.addedOn);
  return days.length > 0 ? days.reduce((a, b) => (a > b ? a : b)) : null;
}

/**
 * How old the world is, counted from the day its first piece landed: days through the first six,
 * then whole weeks, then whole months. It says how long the place has been there and nothing
 * about any day in between.
 */
export function worldAge(
  pieces: readonly WorldPieceRow[],
  today: IsoDate,
): { readonly unit: 'day' | 'week' | 'month'; readonly count: number } | null {
  const days = ordinary(pieces).map((piece) => piece.addedOn);
  if (days.length === 0) return null;
  const first = days.reduce((a, b) => (a < b ? a : b));
  const day = Math.max(1, daysBetween(first, today) + 1);
  if (day < 7) return { unit: 'day', count: day };
  if (day < 30) return { unit: 'week', count: Math.floor(day / 7) };
  return { unit: 'month', count: Math.floor(day / 30) };
}

/**
 * The line under the title: the world's age, then how many things live there. In its first days
 * the count is a sentence ("one thing lives here"); after that it is short ("8 things").
 */
export function worldSubtitle(
  t: Translate,
  pieces: readonly WorldPieceRow[],
  today: IsoDate | null,
): string {
  const count = ordinary(pieces).length;
  const age = today ? worldAge(pieces, today) : null;
  if (count === 0 || !age) return t('world.count.none');
  const aged = t(`world.age.${age.unit}`, { count: age.count });
  const things =
    age.unit !== 'day'
      ? t('world.count.short', { count })
      : count === 1
        ? t('world.count.one')
        : count === 2
          ? t('world.count.two')
          : count === 3
            ? t('world.count.three')
            : t('world.thingsLiveHere', { count });
  return `${aged} · ${things}`;
}

/** The piece that landed last, by day and then by the time of its catch. */
function newest(
  pieces: readonly WorldPieceRow[],
  monsters: ReadonlyMap<string, Pick<MonsterRow, 'name' | 'caughtAt'>>,
): WorldPieceRow | null {
  const key = (piece: WorldPieceRow) =>
    `${piece.addedOn}/${(piece.monsterId && monsters.get(piece.monsterId)?.caughtAt) || ''}/${piece.id}`;
  return ordinary(pieces).reduce<WorldPieceRow | null>(
    (latest, piece) => (latest === null || key(piece) > key(latest) ? piece : latest),
    null,
  );
}

/** The piece that landed today, if the newest one did: the one that pops in on a visit. */
export function arrivedToday(
  pieces: readonly WorldPieceRow[],
  monsters: ReadonlyMap<string, Pick<MonsterRow, 'name' | 'caughtAt'>>,
  today: IsoDate | null,
): WorldPieceRow | null {
  const latest = newest(pieces, monsters);
  return latest && today && latest.addedOn === today ? latest : null;
}

/**
 * Scootch's sentence under the world, written on the phone from what happened: the monster that
 * moved in today by its name, and otherwise a plain line about the size of the place. A quiet
 * piece that landed today is not named and not joked about.
 */
export function worldSentence(
  t: Translate,
  pieces: readonly WorldPieceRow[],
  monsters: ReadonlyMap<string, Pick<MonsterRow, 'name' | 'caughtAt'>>,
  today: IsoDate | null,
): string {
  const count = ordinary(pieces).length;
  if (count === 0) return t('world.empty');
  const arrival = arrivedToday(pieces, monsters, today);
  const name = arrival?.monsterId ? monsters.get(arrival.monsterId)?.name : undefined;
  if (name) return t('world.line.movedIn', { name });
  if (count === 1) return t('world.line.one');
  if (count <= 8) return t('world.line.village');
  if (count <= 24) return t('world.line.busy');
  return t('world.line.town');
}

/**
 * Whether the first offer may be drawn in the world at all. On a day with something heavy in it
 * the world is shown and nothing is sold, whatever the offer's own rule would say.
 */
export function offerMayShow(model: { readonly heavy?: boolean }): boolean {
  return model.heavy !== true;
}
