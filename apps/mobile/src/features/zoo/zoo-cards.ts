import { CARD_LABELS, type CardLanguage } from '@scootch/art';
import {
  guessAndReal,
  isUnlocked,
  type CardData,
  type MonsterRow,
  type OddWord,
  type TaskRow,
} from '@scootch/domain';
import { t } from '@scootch/i18n';

/** A monster with its card: every card field was frozen at the catch. */
export type CaughtMonster = MonsterRow & {
  readonly [
    Field in 'caughtOn' | 'number' | 'rarity' | 'daysLurked' | 'catchMinutes' | 'dread'
  ]: NonNullable<MonsterRow[Field]>;
};

export function isCaught(monster: MonsterRow): monster is CaughtMonster {
  return (
    monster.number !== null &&
    monster.caughtOn !== null &&
    monster.rarity !== null &&
    monster.daysLurked !== null &&
    monster.catchMinutes !== null &&
    monster.dread !== null
  );
}

/**
 * Whether the binder is open: its other orders and its month pages. The entitlement rules decide,
 * from the one thing a screen knows about the store, which is whether Plus is on.
 */
export function binderOpen(plus: boolean): boolean {
  return isUnlocked(plus ? 'lifetime' : 'free', 'binder');
}

/** The card as the art package draws it. `task` is the task's row, when it is still stored. */
export function cardDataFor(monster: CaughtMonster, task: Pick<TaskRow, 'text'> | null): CardData {
  return {
    monster: monster.spec,
    name: monster.name,
    title: monster.title,
    rarity: monster.rarity,
    number: monster.number,
    taskLine: task ? task.text.slice(0, 280) : null,
    daysLurked: monster.daysLurked,
    catchMinutes: monster.catchMinutes,
    dread: monster.dread,
    flavourText: monster.flavourText,
    finish: monster.finish,
    caughtOn: monster.caughtOn,
  };
}

/**
 * The card as the phone draws it: a monster from an odd hatch has its word after its name,
 * "Molar (tiny)", as the binder prints it. Only the picture changes. The server signed the plain
 * name, so what is posted for a page keeps `card` as it is, and the page prints the plain name.
 */
export function drawnCard(
  card: CardData,
  oddWord: OddWord | null | undefined,
  language: CardLanguage,
): CardData {
  if (oddWord == null) return card;
  return { ...card, name: t(language, `card.oddName.${oddWord}`, { name: card.name }) };
}

/** What a screen reader says for a card, as one element: its name, its rarity and its stats. */
export function cardSpokenLabel(card: CardData, language: CardLanguage): string {
  const labels = CARD_LABELS[language];
  const hours = Math.floor(card.catchMinutes / 60);
  return [
    card.name,
    labels.rarity[card.rarity],
    labels.number(String(card.number).padStart(3, '0')),
    `${labels.lurked} ${labels.days(card.daysLurked)}`,
    `${labels.dread} ${card.dread}/5`,
    `${labels.caughtIn} ${labels.durationLong(hours, card.catchMinutes % 60)}`,
  ].join(', ');
}

/**
 * The one line a card prints under its stats when a guess was made before starting: "Thought 2
 * hours. Took 11 minutes." Always those two sentences in plain units, whichever number is the
 * larger, and `null` with no guess: the card is then as it always was.
 */
export function guessLine(
  monster: Pick<MonsterRow, 'guessMinutes' | 'catchMinutes'>,
  language: CardLanguage,
): string | null {
  const pair = guessAndReal(monster);
  if (pair === null) return null;
  const { durationLong, thoughtTook } = CARD_LABELS[language];
  const plain = (minutes: number) => durationLong(Math.floor(minutes / 60), minutes % 60);
  return thoughtTook(plain(pair.thoughtMinutes), plain(pair.tookMinutes));
}
