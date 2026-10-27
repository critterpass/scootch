/**
 * How each route arrives and leaves, as the design moves between screens, using the system's own
 * transitions. Every route file under `app/` is named here; one that is not gets the plain push.
 * A pushed page wears the system's navigation bar, with its large title and its way back (see
 * `ui/page-header.tsx`); every other screen draws its own heading and its close control.
 *
 * - `home`: the desk. Returning to it reads as going back.
 * - `push`: the system's push, with its interruptible swipe back.
 * - `sheet`: a whole page that comes up as the system's sheet at its full height, with a grabber.
 *   Its scroll view is the first thing on it, so the system follows it: pulled down from the top
 *   of what it shows, the page closes, as any system sheet does.
 * - `fitted`: a small sheet with a grabber, as tall as what is on it. Its content has its own
 *   height and never scrolls; the sheet takes that height.
 * - `fade`: a moment, not a place. No swipe.
 * - `over`: a screen drawn from a pull, laid over the one beneath, which shows through it. It draws
 *   its own arrival from the finger (the board grows out of the chalkboard, the logbook page
 *   lowers over the board, the desk sheet rises into the timetable), so the system plays nothing.
 *   A page opened from one of these is presented (a sheet), never pushed: the native stack keeps
 *   pushed pages in its navigation controller, beneath every presented screen, so a page pushed
 *   from the logbook would open out of sight behind it.
 * - `none`: care, where a crisis day is simply there with nothing playing around it.
 */
export type RouteMotion = 'home' | 'push' | 'sheet' | 'fitted' | 'fade' | 'over' | 'none';

export const ROUTE_MOTION: Readonly<Record<string, RouteMotion>> = {
  index: 'home',
  board: 'over',
  logbook: 'over',
  session: 'fade',
  'share/[id]': 'sheet',
  timetable: 'over',
  'tuition/index': 'sheet',
  'tuition/scholarship': 'fitted',
  // Opened from the logbook, which is laid over the board: see `over`.
  'report-card': 'sheet',
  'first-day/index': 'fade',
  settings: 'push',
  'settings/name': 'push',
  'settings/quiet-hours': 'push',
  'care/crisis': 'none',
  'care/serious': 'fade',
  'care/helplines': 'push',
  '(dev)': 'push',
};

/** Screens a person returns to: arriving at one by replacing a child reads as going back. */
const RETURNED_TO: ReadonlySet<string> = new Set(['index']);

/**
 * Pages of rows, where a swipe back may start anywhere across the screen. A page with pictures or
 * controls that are dragged sideways is left out, so there the swipe back starts at the edge only.
 */
const SWIPED_BACK_ANYWHERE: ReadonlySet<string> = new Set(['(dev)']);

/** The boards' sheet corner, the same on the system's sheets as on a sheet drawn on a page. */
export const SHEET_RADIUS = 34;
/** The one height a page sheet rests at: the system's large detent. */
const FULL_HEIGHT: readonly number[] = [1];

export interface StackMotionOptions {
  readonly animation: 'default' | 'fade' | 'none';
  readonly presentation: 'card' | 'modal' | 'formSheet' | 'transparentModal';
  /** The swipe back (or the pull down on a sheet). */
  readonly gestureEnabled: boolean;
  /** The swipe back starts anywhere across the screen, not only at its edge. */
  readonly fullScreenGestureEnabled: boolean;
  readonly animationTypeForReplace: 'push' | 'pop';
  /** A fitted sheet is as tall as its content; a page sheet is as tall as a sheet may be. */
  readonly sheetAllowedDetents?: 'fitToContents' | readonly number[];
  readonly sheetGrabberVisible?: boolean;
  readonly sheetCornerRadius?: number;
  /** A screen laid over another is see-through: the one beneath shows wherever it draws nothing. */
  readonly contentStyle?: { readonly backgroundColor: 'transparent' };
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
    case 'over':
      return {
        animation: 'none',
        presentation: 'transparentModal',
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
        contentStyle: { backgroundColor: 'transparent' },
      };
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
      // A whole page on the system's form sheet at its full height: the sheet follows the first
      // scroll view it finds, so a pull down from the top of the page closes it.
      return {
        animation: moving,
        presentation: 'formSheet',
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
        sheetAllowedDetents: FULL_HEIGHT,
        sheetGrabberVisible: true,
        sheetCornerRadius: SHEET_RADIUS,
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
        sheetCornerRadius: SHEET_RADIUS,
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
