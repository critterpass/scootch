import { monsterPath } from './monster-sharing';
import { wireOpenInApp } from './open-in-app';
import { fetchShared, fill, showState } from './shared-page';

const idShape = /^[a-z0-9-]{1,40}$/;

/** Where "Catch it in the app" goes for one monster, in the page's language. */
export function getPath(id: string, language: string): string {
  return `${language === 'vi' ? '/vi' : ''}/get?m=${encodeURIComponent(id)}`;
}

/**
 * Wires the hand-off page: the monster's name, the button that opens the app with it, the QR
 * code of its link for a wide screen, and the link in plain text.
 */
export async function startGetPage(root: HTMLElement): Promise<void> {
  const lines = JSON.parse(root.dataset['lines'] ?? '{}') as Record<string, string>;
  const language = root.dataset['language'] ?? 'en';
  const id = new URLSearchParams(location.search).get('m') ?? '';
  const switcher = document.querySelector<HTMLAnchorElement>('.footer-end a[hreflang]');
  if (switcher) switcher.href = getPath(id, switcher.hreflang);

  const monster = idShape.test(id)
    ? await fetchShared<{ name: string }>('monster-page', id)
    : 'missing';
  if (monster === 'missing' || monster === 'offline') {
    showState(root, monster);
    return;
  }

  const headline = fill(lines['headlineBy'] ?? '', { name: monster.name });
  const heading = root.querySelector<HTMLElement>('[data-headline]');
  if (heading) heading.textContent = headline;
  document.title = `${headline} · Scootch`;

  const link = new URL(monsterPath(id, language), location.href).href;
  const shown = root.querySelector<HTMLAnchorElement>('[data-link]');
  if (shown) {
    shown.href = link;
    shown.textContent = link.replace(/^https?:\/\//, '');
  }
  const qr = root.querySelector<HTMLImageElement>('[data-qr]');
  if (qr) qr.src = `/get/qr.svg?m=${encodeURIComponent(id)}&lang=${language}`;
  wireOpenInApp(root, id);
  showState(root, 'found');
}
