import { buildMonster, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';

import { wireOpenInApp } from './open-in-app';
import { fetchShared, fill, idFromAddress, keepLanguageSwitchHere, showState } from './shared-page';

/**
 * What `GET /v1/haunt-page/:id` answers with: the monster's body and seed, a dare from the preset
 * list, and the sender's first name unless they sent it without one. Never a task or free words.
 */
export type HauntPage = {
  readonly id: string;
  readonly bodyType: keyof typeof MONSTER_BODIES;
  readonly seed: string;
  readonly dare: string;
  readonly from: { readonly displayName: string | null } | null;
  /** `gone` once it has been caught or shooed; the page never learns which. */
  readonly state: 'waiting' | 'gone';
};

/** Wires the haunt page: the monster, its dare, and shooing it in one tap. */
export async function startHauntPage(root: HTMLElement): Promise<void> {
  const find = <E extends HTMLElement>(selector: string): E => {
    const element = root.querySelector<E>(selector);
    if (!element) throw new Error(`The haunt page has no ${selector}`);
    return element;
  };
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const dares = JSON.parse(root.dataset['dares'] ?? '{}') as Record<string, string>;
  const id = idFromAddress();
  keepLanguageSwitchHere('h', id);

  const haunt = await fetchShared<HauntPage>('haunt-page', id);
  if (haunt === 'missing' || haunt === 'offline') {
    showState(root, haunt);
    return;
  }

  const sender = haunt.from?.displayName ?? null;
  const wanderOff = (state: 'shooed' | 'gone'): void => {
    const told =
      sender === null
        ? (lines['shooedBody'] ?? '')
        : fill(lines['shooedBodyBy'] ?? '', { name: sender });
    find('[data-gone-title]').textContent =
      state === 'shooed' ? (lines['shooedTitle'] ?? '') : (lines['goneTitle'] ?? '');
    find('[data-gone-body]').textContent = state === 'shooed' ? told : (lines['goneBody'] ?? '');
    showState(root, state);
  };
  if (haunt.state !== 'waiting') {
    wanderOff('gone');
    return;
  }

  const headline =
    sender === null ? (lines['headline'] ?? '') : fill(lines['headlineBy'] ?? '', { name: sender });
  document.title = `${headline} · Scootch`;
  find('[data-headline]').textContent = headline;
  find('[data-monster]').innerHTML = toSvg(buildMonster(specFromSeed(haunt.bodyType, haunt.seed)));
  // Only a dare from the preset list is ever shown: an id this page does not know shows nothing.
  const dare = dares[haunt.dare];
  find('[data-dare]').textContent = dare === undefined ? '' : fill(lines['dare'] ?? '', { dare });
  find('[data-dare]').hidden = dare === undefined;

  const shoo = find<HTMLButtonElement>('[data-shoo]');
  shoo.addEventListener('click', () => {
    shoo.disabled = true;
    find('[data-shoo-failed]').hidden = true;
    void fetch(`/api/haunt-page/${encodeURIComponent(id)}/shoo`, { method: 'POST' })
      .then((response) => response.ok)
      .catch(() => false)
      .then((shooed) => {
        if (shooed) return wanderOff('shooed');
        shoo.disabled = false;
        find('[data-shoo-failed]').hidden = false;
      });
  });
  wireOpenInApp(root, id);
  showState(root, 'waiting');
}
