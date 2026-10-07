import { createContext, useContext, useEffect } from 'react';

/** The pages that stand side by side, in the order they are swiped through. */
export const HOME_PAGES = ['world', 'home', 'settings'] as const;
export type HomePage = (typeof HOME_PAGES)[number];

export interface HomePagerHandle {
  /** Slides to a page, as its corner button or its close control does. */
  readonly show: (page: HomePage) => void;
  /** Holds the pages still until the function it returns is called. */
  readonly hold: () => () => void;
}

export const HomePagerContext = createContext<HomePagerHandle | null>(null);
export const PageShownContext = createContext(true);

/** The pager a screen is a page of, or `null` for a screen that is on a route of its own. */
export function useHomePager(): HomePagerHandle | null {
  return useContext(HomePagerContext);
}

/**
 * Keeps the pages from being swiped while `held`: something on the page has the finger (a hold on
 * the composer, a card being handled) or stands over it (the drawer, the keyboard).
 */
export function usePagerHold(held: boolean): void {
  const pager = useContext(HomePagerContext);
  useEffect(() => (held && pager ? pager.hold() : undefined), [held, pager]);
}

/**
 * Whether any of this page is on the screen. A page beside home is kept ready while it is out of
 * sight; a screen on a route of its own is always shown.
 */
export function usePageShown(): boolean {
  return useContext(PageShownContext);
}
