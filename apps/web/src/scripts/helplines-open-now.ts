import { HELPLINES, orderedAt, type Helpline } from '@scootch/i18n';

const HALF_A_MINUTE = 30_000;

/**
 * Shows which lines are open at an instant, by each line's own time zone: a closed line says so
 * and moves below the open ones of its country, after the emergency number. No line is ever
 * hidden, and every link stays where it is on its row.
 */
export function showOpenNow(list: HTMLElement, now: number): void {
  const items = [...list.querySelectorAll<HTMLElement>('li[data-line]')];
  const countries = new Map<string, HTMLElement[]>();
  for (const item of items) {
    const country = item.dataset['country'] ?? '';
    countries.set(country, [...(countries.get(country) ?? []), item]);
  }
  for (const group of countries.values()) {
    const itemOf = new Map<Helpline, HTMLElement>();
    for (const item of group) {
      const line = HELPLINES[Number(item.dataset['line'])];
      if (line) itemOf.set(line, item);
    }
    // A country's rows sit together, so whatever follows the last of them follows the block.
    const after = group[group.length - 1]?.nextElementSibling ?? null;
    const lines = HELPLINES.filter((line) => itemOf.has(line));
    for (const { line, open } of orderedAt(lines, now)) {
      const item = itemOf.get(line);
      if (!item) continue;
      const detail = item.querySelector<HTMLElement>('[data-detail]');
      const words = open ? item.dataset['openDetail'] : item.dataset['closedDetail'];
      if (detail && words !== undefined) detail.textContent = words;
      item.toggleAttribute('data-closed', !open);
      list.insertBefore(item, after);
    }
  }
}

/** Keeps a helpline list right by the reader's clock for as long as the page is open. */
export function keepOpenNow(list: HTMLElement): void {
  showOpenNow(list, Date.now());
  setInterval(() => showOpenNow(list, Date.now()), HALF_A_MINUTE);
}
