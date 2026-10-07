import type { Href } from 'expo-router';

/** The part of the router a way back needs. */
export interface BackRouter {
  canGoBack(): boolean;
  back(): void;
  replace(href: Href): void;
}

/**
 * Closes a screen the way it was opened: back along the stack, so the transition runs in reverse
 * and the screen underneath is the one the person left. Opened with nothing under it (a link, a
 * relaunch), it goes to `fallback` instead.
 */
export function goBack(router: BackRouter, fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
