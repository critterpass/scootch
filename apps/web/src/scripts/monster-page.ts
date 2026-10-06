import { buildMonster, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';

import { sharedFromHere, unshareMonster } from './monster-sharing';
import {
  dateLocale,
  drawFacts,
  fetchShared,
  fill,
  idFromAddress,
  keepLanguageSwitchHere,
  showState,
} from './shared-page';
import { startWaitlistForm } from './waitlist-form';

/** What `GET /v1/monster-page/:id` answers with. */
type SharedMonster = {
  readonly id: string;
  readonly seed: string;
  readonly bodyType: keyof typeof MONSTER_BODIES;
  readonly name: string;
  readonly flavourText: string;
  readonly typed: string | null;
  readonly status: 'wild' | 'caught';
  readonly caughtAt: string | null;
  readonly catchMinutes: number | null;
  readonly sharedAt: string;
};

/** Wires a monster's own page: fetch the monster in the address, then draw it wild or caught. */
export async function startMonsterPage(root: HTMLElement): Promise<void> {
  const find = <E extends HTMLElement>(selector: string): E => {
    const element = root.querySelector<E>(selector);
    if (!element) throw new Error(`The monster page has no ${selector}`);
    return element;
  };
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const language = root.dataset['language'] ?? 'en';
  const id = idFromAddress();
  keepLanguageSwitchHere('m', id);

  const monster = await fetchShared<SharedMonster>('monster-page', id);
  if (monster === 'missing' || monster === 'offline') {
    showState(root, monster);
    return;
  }

  const caught = monster.status === 'caught';
  const status = caught ? (lines['caught'] ?? '') : (lines['wild'] ?? '');
  const minutes = String(monster.catchMinutes ?? '');
  const locale = dateLocale(language);
  const day = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const moment = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  document.title = `${monster.name} · Scootch`;
  root.dataset['status'] = monster.status;
  find('[data-card-art]').innerHTML = toSvg(
    buildMonster(specFromSeed(monster.bodyType, monster.seed)),
  );
  find('[data-card-name]').textContent = monster.name;
  find('[data-card-badge]').textContent = status;
  find('[data-card-typed]').textContent = monster.typed === null ? '' : `“${monster.typed}”`;
  find('[data-card-typed]').hidden = monster.typed === null;
  find('[data-card-flavour]').textContent = monster.flavourText;
  find('[data-card-foot]').textContent =
    caught && monster.catchMinutes !== null
      ? fill(lines['caughtIn'] ?? '', { minutes })
      : caught
        ? status
        : (lines['notCaught'] ?? '');
  find('[data-card]').setAttribute(
    'aria-label',
    fill(lines['cardLabel'] ?? '', {
      name: monster.name,
      status: status.toLowerCase(),
      flavour: monster.flavourText,
    }),
  );
  find('[data-eyebrow]').textContent = caught
    ? (lines['caughtEyebrow'] ?? '')
    : (lines['wildEyebrow'] ?? '');
  find('[data-eyebrow]').classList.toggle('tomato-text', caught);
  find('[data-name]').textContent = monster.name;
  find('[data-flavour]').textContent = monster.flavourText;

  const facts: [string, string][] = [[lines['statusLabel'] ?? '', status]];
  if (monster.typed !== null) facts.unshift([lines['typedLabel'] ?? '', `“${monster.typed}”`]);
  if (caught && monster.caughtAt !== null) {
    facts.push([lines['caughtLabel'] ?? '', moment.format(new Date(monster.caughtAt))]);
    if (monster.catchMinutes !== null) {
      facts.push([lines['tookLabel'] ?? '', fill(lines['minutes'] ?? '', { minutes })]);
    }
  } else {
    facts.push([lines['hatchedLabel'] ?? '', day.format(new Date(monster.sharedAt))]);
  }
  drawFacts(find('[data-facts]'), facts);

  // A caught monster cannot be caught twice: the way into the app is then just the app.
  const catchIt = root.querySelector<HTMLElement>('[data-catch]');
  if (catchIt && caught) catchIt.textContent = lines['getScootch'] ?? '';

  const waitlist = root.querySelector<HTMLElement>('[data-waitlist]');
  if (waitlist) {
    startWaitlistForm(waitlist, () =>
      Promise.resolve({ id: monster.id, name: monster.name.split(',')[0] ?? null }),
    );
  }

  const yours = find('[data-yours]');
  yours.hidden = !sharedFromHere(monster.id);
  yours.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (target?.dataset['action'] !== 'unshare') return;
    void unshareMonster(monster.id).then((gone) => {
      if (gone) showState(root, 'missing');
    });
  });

  showState(root, 'found');
}
