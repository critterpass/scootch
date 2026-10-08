/**
 * How each route arrives and leaves, as the design moves between screens, using the system's own
 * transitions. Every route file under `app/` is named here; one that is not gets the plain push.
 * No route wears the system's navigation bar: every screen draws its own heading and its close
 * control in the trailing corner, so a screen looks the same however it was reached.
 *
 * - `home`: the one screen. Returning to it reads as going back.
 * - `push`: the system's push, with its interruptible swipe back: the world, the binder, the record,
 *   the camera, settings and their children. From home the world and settings are not pushed at all: they are
 *   the pages either side of it.
 * - `sheet`: a whole page that comes up as the system's page sheet, pulled down to close: the Plus
 *   sheet, the share composer. It is laid out as any page is.
 * - `fitted`: a small sheet with a grabber, as tall as what is on it: a haunt, the languages, the
 *   quiet hours. Its content has its
 *   own height and never scrolls; the sheet takes that height.
 * - `fade`: a moment, not a place: the session, the reveal, a purchase's own screen. No swipe.
 * - `none`: care. A crisis day is simply there, with nothing playing around it.
 */
export type RouteMotion = 'home' | 'push' | 'sheet' | 'fitted' | 'fade' | 'none';

export const ROUTE_MOTION: Readonly<Record<string, RouteMotion>> = {
  index: 'home',
  world: 'push',
  zoo: 'push',
  'binder/card': 'push',
  'binder/pages': 'push',
  record: 'push',
  studio: 'push',
  camera: 'push',
  'camera-after': 'push',
  settings: 'push',
  'finish-with': 'push',
  'look/icon': 'push',
  'look/wallpaper': 'push',
  privacy: 'push',
  helplines: 'push',
  account: 'push',
  friends: 'push',
  'table/index': 'push',
  'table/seat': 'push',
  'table-settings': 'push',
  'table-quieted': 'push',
  't/[code]': 'push',
  'f/[code]': 'push',
  'm/[id]': 'push',
  'vi/m/[id]': 'push',
  'plus/manage': 'push',
  'plus/records': 'push',
  '(dev)': 'push',
  'plus/index': 'sheet',
  share: 'sheet',
  'haunt/send': 'fitted',
  'haunt/received': 'fitted',
  language: 'fitted',
  'quiet-hours': 'fitted',
  session: 'fade',
  reveal: 'fade',
  'plus/last-day': 'fade',
  'plus/welcome': 'fade',
  'plus/renewal-off': 'fade',
  care: 'none',
};

/** Screens a person returns to: arriving at one by replacing a child reads as going back. */
const RETURNED_TO: ReadonlySet<string> = new Set(['index', 'world', 'settings', 'record']);

/**
 * Pages of rows, where a swipe back may start anywhere across the screen. The world, the zoo, the
 * record and a table have pictures and controls that are dragged sideways, so there the swipe back
 * starts at the edge only.
 */
const SWIPED_BACK_ANYWHERE: ReadonlySet<string> = new Set([
  'settings',
  'finish-with',
  'look/icon',
  'look/wallpaper',
  'privacy',
  'helplines',
  'account',
  'friends',
  'table-settings',
  'table-quieted',
  'plus/manage',
]);

export interface StackMotionOptions {
  readonly animation: 'default' | 'fade' | 'none';
  readonly presentation: 'card' | 'modal' | 'formSheet';
  /** The swipe back (or the pull down on a sheet). */
  readonly gestureEnabled: boolean;
  /** The swipe back starts anywhere across the screen, not only at its edge. */
  readonly fullScreenGestureEnabled: boolean;
  readonly animationTypeForReplace: 'push' | 'pop';
  /** A fitted sheet is as tall as its content, and rests nowhere else. */
  readonly sheetAllowedDetents?: 'fitToContents';
  readonly sheetGrabberVisible?: boolean;
}

export function routeMotion(routeName: string): RouteMotion {
  return ROUTE_MOTION[routeName] ?? 'push';
}

/**
 * The native stack's options for one route. Where nothing may move (the app's Motion switch, a
 * serious task, a capture) every transition is a crossfade at most; the system itself calms its
 * own transitions under Reduce Motion. The way back by gesture stays wherever a screen has one.
 */
export function stackMotion(routeName: string, mayMove: boolean): StackMotionOptions {
  const motion = routeMotion(routeName);
  const animationTypeForReplace = RETURNED_TO.has(routeName) ? 'pop' : 'push';
  const moving = mayMove ? 'default' : 'fade';
  switch (motion) {
    case 'none':
      return {
        animation: 'none',
        presentation: 'card',
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
      };
    case 'fade':
      return {
        animation: 'fade',
        presentation: 'card',
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
      };
    case 'sheet':
      // A whole page: the system's page sheet, which lays its content out as a card does. A form
      // sheet does not give a page a height to fill, and moves the first list it finds.
      return {
        animation: moving,
        presentation: 'modal',
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
      };
    case 'fitted':
      return {
        animation: moving,
        presentation: 'formSheet',
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
        sheetAllowedDetents: 'fitToContents',
        sheetGrabberVisible: true,
      };
    case 'home':
      return {
        animation: moving,
        presentation: 'card',
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
      };
    case 'push':
      return {
        animation: moving,
        presentation: 'card',
        gestureEnabled: true,
        fullScreenGestureEnabled: SWIPED_BACK_ANYWHERE.has(routeName),
        animationTypeForReplace,
      };
  }
}
