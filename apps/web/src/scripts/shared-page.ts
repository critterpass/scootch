/** What the pages of shared things have in common: the id in the address, one fetch, the states. */

export const fill = (line: string, values: Readonly<Record<string, string>>): string =>
  line.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);

/** Dates read day first in both languages: "Tue 6 Oct", "Th 3, 6 thg 10". */
export function dateLocale(language: string): string {
  return language === 'vi' ? 'vi-VN' : 'en-GB';
}

/** The last part of the address: `/m/molar-7f3k9x` and `/vi/m/molar-7f3k9x` both give the id. */
export function idFromAddress(): string {
  return decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() ?? '');
}

/** The shared thing, `missing` when there is none (or it was unshared), `offline` otherwise. */
export async function fetchShared<T>(
  route: string,
  id: string,
  /** The page's language, for an answer whose words the server writes. */
  language?: string,
): Promise<T | 'missing' | 'offline'> {
  try {
    const query = language === undefined ? '' : `?lang=${encodeURIComponent(language)}`;
    const response = await fetch(`/api/${route}/${encodeURIComponent(id)}${query}`);
    if (response.status === 404 || response.status === 400) return 'missing';
    if (!response.ok) return 'offline';
    return (await response.json()) as T;
  } catch {
    return 'offline';
  }
}

/** Shows the blocks of one state and moves to its headline, so the change is announced. */
export function showState(root: HTMLElement, state: string): void {
  root.dataset['state'] = state;
  for (const element of root.querySelectorAll<HTMLElement>('[data-show]')) {
    element.hidden = !(element.dataset['show'] ?? '').split(' ').includes(state);
  }
  root.querySelector<HTMLElement>(`[data-show~="${state}"] h1`)?.focus({ preventScroll: true });
}

/** The language switch in the footer keeps the reader on the same shared thing. */
export function keepLanguageSwitchHere(
  kind: 'm' | 'c' | 's' | 't' | 'f' | 'h' | 'r',
  id: string,
): void {
  const link = document.querySelector<HTMLAnchorElement>('.footer-end a[hreflang]');
  if (link) link.href = `${link.hreflang === 'vi' ? '/vi' : ''}/${kind}/${encodeURIComponent(id)}`;
}

/** Rows of a small facts table: label and value. */
export function drawFacts(list: HTMLElement, facts: readonly (readonly [string, string])[]): void {
  list.replaceChildren(
    ...facts.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      return row;
    }),
  );
}
