/**
 * How each route arrives and leaves, as the design moves between screens. Every route file under
 * `app/` is named here; one that is not gets the plain push.
 *
 * - `home`: the one screen. Returning to it reads as going back.
 * - `push`: slides in from the side and can be swiped back: the world, the zoo, the record,
 *   settings and their children.
 * - `sheet`: rises as a sheet and is pulled down to close.
 * - `fade`: a moment, not a place: the session, the reveal, a purchase's own screen. No swipe.
 * - `none`: care. A crisis day is simply there, with nothing playing around it.
 */
export type RouteMotion = 'home' | 'push' | 'sheet' | 'fade' | 'none';

export const ROUTE_MOTION: Readonly<Record<string, RouteMotion>> = {
  index: 'home',
  world: 'push',
  zoo: 'push',
  record: 'push',
  shelf: 'push',
  settings: 'push',
  'finish-with': 'push',
  privacy: 'push',
  helplines: 'push',
  account: 'push',
  friends: 'push',
  'table/index': 'push',
  'table/seat': 'push',
  't/[code]': 'push',
  'f/[code]': 'push',
  'plus/manage': 'push',
  'plus/records': 'push',
  '(dev)': 'push',
  'plus/index': 'sheet',
  'haunt/send': 'sheet',
  'haunt/received': 'sheet',
  session: 'fade',
  reveal: 'fade',
  'plus/last-day': 'fade',
  'plus/lifetime': 'fade',
  'plus/trial-started': 'fade',
  'plus/renewal-off': 'fade',
  care: 'none',
};

/** Screens a person returns to: arriving at one by replacing a child reads as going back. */
const RETURNED_TO: ReadonlySet<string> = new Set(['index', 'world', 'settings', 'record']);

export interface StackMotionOptions {
  readonly animation: 'default' | 'fade' | 'none';
  readonly presentation: 'card' | 'modal';
  /** The swipe from the edge (or the pull down on a sheet) that goes back. */
  readonly gestureEnabled: boolean;
  readonly animationTypeForReplace: 'push' | 'pop';
}

export function routeMotion(routeName: string): RouteMotion {
  return ROUTE_MOTION[routeName] ?? 'push';
}

/**
 * The native stack's options for one route. Where nothing may move (Reduce Motion, the Motion
 * switch, a serious task) every transition is a crossfade at most; the way back by gesture stays.
 */
export function stackMotion(routeName: string, mayMove: boolean): StackMotionOptions {
  const motion = routeMotion(routeName);
  const animationTypeForReplace = RETURNED_TO.has(routeName) ? 'pop' : 'push';
  switch (motion) {
    case 'none':
      return {
        animation: 'none',
        presentation: 'card',
        gestureEnabled: false,
        animationTypeForReplace,
      };
    case 'fade':
      return {
        animation: 'fade',
        presentation: 'card',
        gestureEnabled: false,
        animationTypeForReplace,
      };
    case 'sheet':
      return {
        animation: mayMove ? 'default' : 'fade',
        presentation: 'modal',
        gestureEnabled: true,
        animationTypeForReplace,
      };
    case 'home':
      return {
        animation: mayMove ? 'default' : 'fade',
        presentation: 'card',
        gestureEnabled: false,
        animationTypeForReplace,
      };
    case 'push':
      return {
        animation: mayMove ? 'default' : 'fade',
        presentation: 'card',
        gestureEnabled: true,
        animationTypeForReplace,
      };
  }
}
