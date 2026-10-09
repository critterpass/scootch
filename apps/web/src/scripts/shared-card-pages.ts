import {
  buildCard,
  buildMonster,
  CARD_BLEED,
  CARD_HEIGHT,
  CARD_LABELS,
  CARD_WIDTH,
  toSvg,
} from '@scootch/art';

import { startCardTilt } from './card-tilt';
import {
  dateLocale,
  drawFacts,
  fetchShared,
  fill,
  idFromAddress,
  keepLanguageSwitchHere,
  showState,
} from './shared-page';

type CardData = Parameters<typeof buildCard>[0];

/** What `GET /v1/shared-card/:id` and `GET /v1/shared-story/:id` answer with. */
type SharedCard = {
  readonly language: 'en' | 'vi';
  readonly card: CardData;
  readonly sharerName: string | null;
  readonly headline: string | null;
};

type Page = {
  readonly find: <E extends HTMLElement>(selector: string) => E;
  readonly lines: Record<string, string>;
  readonly language: 'en' | 'vi';
};

function open(root: HTMLElement): Page {
  return {
    find: <E extends HTMLElement>(selector: string): E => {
      const element = (root.closest('main') ?? root).querySelector<E>(selector);
      if (!element) throw new Error(`The shared page has no ${selector}`);
      return element;
    },
    lines: JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>,
    language: root.dataset['language'] === 'vi' ? 'vi' : 'en',
  };
}

/** A `YYYY-MM-DD` day in words, with no time zone involved. */
function dayInWords(isoDate: string, language: string, long: boolean): string {
  return new Intl.DateTimeFormat(dateLocale(language), {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * "Thought 2 hours. Took 11 minutes.", in the card's own words, when the sharer left the guess
 * showing; `null` for a card shared without one, which the page shows as it always did.
 */
function thoughtTook(card: CardData, language: 'en' | 'vi'): string | null {
  if (card.guessMinutes === undefined) return null;
  const labels = CARD_LABELS[language];
  const long = (minutes: number) => labels.durationLong(Math.floor(minutes / 60), minutes % 60);
  return labels.thoughtTook(long(card.guessMinutes), long(card.catchMinutes));
}

function onlyShown(lines: Record<string, string>, sharerName: string | null): string {
  return sharerName === null
    ? (lines['onlyShown'] ?? '')
    : fill(lines['onlyShownBy'] ?? '', { name: sharerName });
}

/** Wires the caught card page: the card as the app draws it, its numbers, and the tilt. */
export async function startCaughtCardPage(root: HTMLElement): Promise<void> {
  const { find, lines, language } = open(root);
  const id = idFromAddress();
  keepLanguageSwitchHere('c', id);
  const shared = await fetchShared<SharedCard>('shared-card', id);
  if (shared === 'missing' || shared === 'offline') {
    find('[data-ask]').hidden = shared === 'missing';
    showState(root, shared);
    return;
  }

  const { card, sharerName } = shared;
  const labels = CARD_LABELS[language];
  const short = card.name.split(',')[0] ?? card.name;
  const duration = labels.duration(Math.floor(card.catchMinutes / 60), card.catchMinutes % 60);
  const durationLong = labels.durationLong(
    Math.floor(card.catchMinutes / 60),
    card.catchMinutes % 60,
  );

  document.title = `${fill(lines['home'] ?? '', { name: short })} · Scootch`;
  const holder = find('[data-card]');
  // The stamp hangs over the card's edge, so the drawing space is a little wider than the card.
  // With a guess, the card prints its line under the stats, as the app's card does.
  holder.innerHTML = toSvg(buildCard(card, { language, guessMinutes: card.guessMinutes ?? null }), {
    width: CARD_WIDTH + CARD_BLEED,
    height: CARD_HEIGHT,
  });
  holder.setAttribute(
    'aria-label',
    [
      fill(lines['cardLabel'] ?? '', { name: card.name, duration, flavour: card.flavourText }),
      thoughtTook(card, language),
    ]
      .filter((part) => part !== null)
      .join(' '),
  );
  find('[data-eyebrow]').textContent =
    sharerName === null
      ? (lines['eyebrow'] ?? '')
      : fill(lines['eyebrowBy'] ?? '', { name: sharerName });
  find('[data-home]').textContent = fill(lines['home'] ?? '', { name: short });
  find('[data-story]').textContent = fill(lines['story'] ?? '', {
    days: labels.days(card.daysLurked),
    duration: durationLong,
  });
  const facts: [string, string][] = [
    [lines['lurked'] ?? '', labels.days(card.daysLurked)],
    [lines['caughtIn'] ?? '', duration],
    [lines['rarity'] ?? '', labels.rarity[card.rarity]],
    [lines['number'] ?? '', labels.number(String(card.number).padStart(3, '0'))],
    [lines['caughtOn'] ?? '', dayInWords(card.caughtOn, language, false)],
  ];
  // Only when the sharer left the task showing: a hidden task never reaches this page.
  if (card.taskLine !== null) facts.push([lines['task'] ?? '', `“${card.taskLine}”`]);
  drawFacts(find('[data-facts]'), facts);
  find('[data-only-shown]').textContent = onlyShown(lines, sharerName);

  showState(root, 'found');
  startCardTilt(holder, root.querySelector<HTMLElement>('[data-tilt-allow]'));
}

/** Wires the share story page: three lines, Scootch cheering and the monster asleep. */
export async function startStoryPage(root: HTMLElement): Promise<void> {
  const { find, lines, language } = open(root);
  const id = idFromAddress();
  keepLanguageSwitchHere('s', id);
  const shared = await fetchShared<SharedCard>('shared-story', id);
  if (shared === 'missing' || shared === 'offline') {
    showState(root, shared);
    return;
  }

  const { card, sharerName, headline } = shared;
  const labels = CARD_LABELS[language];
  const did = headline ?? labels.storyHeadline;
  document.title = `${did} · Scootch`;
  find('[data-kicker]').textContent = [dayInWords(card.caughtOn, language, true), sharerName]
    .filter((part) => part !== null)
    .join(' · ');
  find('[data-did]').textContent = did;
  find('[data-waited]').textContent = fill(lines['waited'] ?? '', {
    days: labels.days(card.daysLurked),
  });
  find('[data-took]').textContent = fill(lines['took'] ?? '', {
    duration: labels.durationLong(Math.floor(card.catchMinutes / 60), card.catchMinutes % 60),
  });
  // Under the headline, as the story picture prints it; a story shared without one has no line.
  const guessed = thoughtTook(card, language);
  const guessLine = find('[data-thought-took]');
  guessLine.textContent = guessed ?? '';
  guessLine.hidden = guessed === null;
  find('[data-monster]').innerHTML = toSvg(buildMonster(card.monster));
  find('[data-only-shown]').textContent = onlyShown(lines, sharerName);
  showState(root, 'found');
}
