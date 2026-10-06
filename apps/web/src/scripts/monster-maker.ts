import { buildMonster, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';

import { saveCardImage } from './card-image';
import { monsterPath, shareMonster, unshareMonster } from './monster-sharing';
import { startWaitlistForm } from './waitlist-form';

type State = 'empty' | 'hatching' | 'hatched' | 'nap' | 'offline' | 'serious';

type Monster = {
  readonly seed: string;
  readonly bodyType: keyof typeof MONSTER_BODIES;
  readonly name: string;
  readonly flavourText: string;
  /** What the visitor typed. It stays in this page: it is shown on the card and nowhere else. */
  readonly typed: string;
};

/** What `POST /v1/monster-make` answers with. */
type Answer =
  | { readonly verdict: 'serious' | 'crisis' }
  | { readonly verdict: 'pass'; readonly result: 'nonsense' }
  | ({ readonly verdict: 'pass'; readonly result: 'monster' } & Omit<Monster, 'typed'>);

type Outcome = Answer | 'nap' | 'offline';

/** The egg shakes for about two seconds, however fast the answer comes. */
const hatchingMs = 1900;

const fill = (line: string, values: Readonly<Record<string, string>>): string =>
  line.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);

async function ask(text: string, language: string): Promise<Outcome> {
  try {
    const response = await fetch('/api/monster-make', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (response.status === 429) return 'nap';
    if (response.status === 400) return { verdict: 'pass', result: 'nonsense' };
    if (!response.ok) return 'offline';
    return (await response.json()) as Answer;
  } catch {
    return 'offline';
  }
}

/** Wires one monster maker: the field, its states and the card. */
export function startMonsterMaker(root: HTMLElement): void {
  const find = <E extends HTMLElement>(selector: string): E => {
    const element = root.querySelector<E>(selector);
    if (!element) throw new Error(`The monster maker has no ${selector}`);
    return element;
  };
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const language = root.dataset['language'] ?? 'en';
  const form = find<HTMLFormElement>('form');
  const input = find<HTMLInputElement>('input[name="text"]');
  const error = find('[data-error]');
  const status = find('[data-status]');
  const showTyped = find<HTMLInputElement>('[data-show-typed]');
  const card = find('[data-card]');
  let last: Monster | undefined;
  /** The share of the monster on screen, and whether it shows the typed line. */
  let shared: { id: string; typedShown: boolean } | undefined;
  const shareStatus = find('[data-share-status]');

  const say = (line: string, id?: string): void => {
    const [before = '', after = ''] = line.split('{link}');
    shareStatus.replaceChildren(before);
    if (id === undefined) return;
    const link = document.createElement('a');
    link.href = monsterPath(id, language);
    link.textContent = `${location.host}${monsterPath(id, language)}`;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'link-button';
    undo.dataset['action'] = 'unshare';
    undo.textContent = lines['unshare'] ?? '';
    shareStatus.append(link, after, ' ', undo);
  };

  /**
   * Shares the monster on screen as the toggle stands now, once. A share made with the typed
   * line showing is taken down before one without it goes up, and the other way round.
   */
  const ensureShared = async (): Promise<string | null> => {
    if (!last) return null;
    const typedShown = showTyped.checked;
    if (shared?.typedShown === typedShown) return shared.id;
    if (shared) await unshareMonster(shared.id);
    shared = undefined;
    const outcome = await shareMonster(
      { ...last, typed: typedShown ? last.typed : null },
      language,
    );
    if (outcome === 'heavy') {
      // Screened again on the way out: no card and no share for a heavy thing.
      last = undefined;
      find('[data-card-art]').replaceChildren();
      input.value = '';
      show('serious');
      return null;
    }
    if (outcome === 'failed') {
      say(lines['shareFailed'] ?? '');
      return null;
    }
    shared = { id: outcome.id, typedShown };
    return outcome.id;
  };

  const share = async (): Promise<void> => {
    const id = await ensureShared();
    if (id === null) return;
    const url = new URL(monsterPath(id, language), location.href).href;
    try {
      if (navigator.share) await navigator.share({ url, title: last?.name ?? '' });
      else await navigator.clipboard.writeText(url);
    } catch {
      // The sheet was closed or the clipboard is off limits: the link is on screen either way.
    }
    say(lines['copied'] ?? '', id);
  };

  const save = async (): Promise<void> => {
    if (!last) return;
    const card = { ...last, typed: showTyped.checked ? last.typed : null };
    const id = await ensureShared();
    if (!last) return;
    await saveCardImage(card);
    if (id !== null) say(lines['saved'] ?? '', id);
  };

  const waitlist = root.querySelector<HTMLElement>('[data-waitlist]');
  if (waitlist) {
    startWaitlistForm(waitlist, async () => {
      const id = await ensureShared();
      // The line afterwards promises to keep the monster only when it was kept.
      return { id, name: id === null ? null : (last?.name.split(',')[0] ?? null) };
    });
  }

  const show = (state: State): void => {
    root.dataset['state'] = state;
    for (const element of root.querySelectorAll<HTMLElement>('[data-show]')) {
      element.hidden = !(element.dataset['show'] ?? '').split(' ').includes(state);
    }
    const busy = state === 'hatching';
    input.readOnly = busy;
    form.setAttribute('aria-busy', String(busy));
    status.textContent = busy ? (status.dataset['hatching'] ?? '') : '';
    for (const element of root.querySelectorAll<HTMLElement>('[data-last-only]')) {
      element.hidden = last === undefined;
    }
    // A new state is announced by moving to its headline, except while the visitor is typing.
    if (state !== 'empty' && state !== 'hatching') {
      root.querySelector<HTMLElement>(`[data-show~="${state}"] h1`)?.focus({ preventScroll: true });
    }
  };

  const drawTypedLine = (): void => {
    if (!last) return;
    const shown = showTyped.checked;
    find('[data-card-typed]').textContent = shown ? `“${last.typed}”` : '';
    find('[data-card-typed]').hidden = !shown;
    find('[data-typed-note]').textContent = shown
      ? fill(lines['typedShown'] ?? '', { text: last.typed })
      : (lines['typedHidden'] ?? '');
  };

  const drawCard = (monster: Monster): void => {
    last = monster;
    shared = undefined;
    shareStatus.replaceChildren();
    const spec = specFromSeed(monster.bodyType, monster.seed);
    find('[data-card-art]').innerHTML = toSvg(buildMonster(spec));
    find('[data-card-name]').textContent = monster.name;
    find('[data-card-flavour]').textContent = monster.flavourText;
    find('[data-meet]').textContent = fill(lines['meet'] ?? '', { name: monster.name });
    find('[data-flavour]').textContent = monster.flavourText;
    card.setAttribute(
      'aria-label',
      fill(lines['cardLabel'] ?? '', { name: monster.name, flavour: monster.flavourText }),
    );
    showTyped.checked = true;
    drawTypedLine();
  };

  const hatch = async (): Promise<void> => {
    const text = input.value.trim();
    error.textContent = '';
    if (text === '') {
      error.textContent = lines['empty'] ?? '';
      input.focus();
      return;
    }
    show('hatching');
    const [outcome] = await Promise.all([
      ask(text, language),
      new Promise((resolve) => setTimeout(resolve, hatchingMs)),
    ]);
    if (outcome === 'nap' || outcome === 'offline') {
      show(outcome);
    } else if (outcome.verdict !== 'pass') {
      // A heavy text: no monster, and nothing of an earlier one stays on screen.
      last = undefined;
      find('[data-card-art]').replaceChildren();
      input.value = '';
      show('serious');
    } else if (outcome.result === 'nonsense') {
      show(last ? 'hatched' : 'empty');
      error.textContent = lines['nonsense'] ?? '';
      input.focus();
    } else {
      drawCard({ ...outcome, typed: text });
      show('hatched');
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (root.dataset['state'] !== 'hatching') void hatch();
  });
  showTyped.addEventListener('change', drawTypedLine);
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) return;
    if (target.hasAttribute('data-example')) {
      input.value = target.textContent.trim();
      input.focus();
    } else if (target.dataset['action'] === 'reset') {
      show('empty');
      input.focus();
    } else if (target.dataset['action'] === 'wake') {
      show(last ? 'hatched' : 'empty');
    } else if (target.dataset['action'] === 'save') {
      void save();
    } else if (target.dataset['action'] === 'share') {
      void share();
    } else if (target.dataset['action'] === 'unshare' && shared) {
      const { id } = shared;
      void unshareMonster(id).then((gone) => {
        if (!gone) return;
        if (shared?.id === id) shared = undefined;
        say(lines['unshared'] ?? '');
      });
    }
  });
}
