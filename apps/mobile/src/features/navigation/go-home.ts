/** The part of the router going home needs. */
export interface HomeRouter {
  canGoBack(): boolean;
  dismissTo(href: '/'): void;
  replace(href: '/'): void;
}

/**
 * Closes whatever is open and shows the one screen that is already there, with everything typed
 * and chosen on it. Replacing with `/` would put a second, empty one screen over the first. Only
 * a screen with nothing under it (opened cold from a link) has no one screen to go back to, and
 * becomes it.
 */
export function goHome(router: HomeRouter): void {
  if (router.canGoBack()) router.dismissTo('/');
  else router.replace('/');
}
