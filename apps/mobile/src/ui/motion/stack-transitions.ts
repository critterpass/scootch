/**
 * How each route arrives and leaves, as the design moves between screens, using the system's own
 * transitions. Every route file under `app/` is named here; one that is not gets the plain push.
 *
 * - `home`: the one screen. Returning to it reads as going back.
 * - `push`: the system's push, with its interruptible swipe back: the world, the zoo, the record,
 *   settings and their children. From home the world and settings are not pushed at all: they are
 *   the pages either side of it.
 * - `sheet`: a system sheet with a grabber, pulled down to close.
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
  'table-settings': 'push',
  'table-quieted': 'push',
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

/**
 * Pages of rows, where a swipe back may start anywhere across the screen. The world, the zoo, the
 * record and a table have pictures and controls that are dragged sideways, so there the swipe back
 * starts at the edge only.
 */
const SWIPED_BACK_ANYWHERE: ReadonlySet<string> = new Set([
  'settings',
  'finish-with',
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
  readonly presentation: 'card' | 'formSheet';
  /** The swipe back (or the pull down on a sheet). */
  readonly gestureEnabled: boolean;
  /** The swipe back starts anywhere across the screen, not only at its edge. */
  readonly fullScreenGestureEnabled: boolean;
  readonly animationTypeForReplace: 'push' | 'pop';
  /** A sheet rests at the top only: its content is a whole page. */
  readonly sheetAllowedDetents?: readonly number[];
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
      return {
        animation: moving,
        presentation: 'formSheet',
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        animationTypeForReplace,
        sheetAllowedDetents: [1],
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

/**
 * Which routes wear the system's navigation bar, and how.
 *
 * - `page`: a page of rows under a bar in the page's colour. The list is under the bar, never
 *   behind it. A page's large title is drawn by the page, which hands it to the bar as it scrolls.
 * - `frame`: a keeping screen (the world, the zoo, the record) under a bar in the page's colour:
 *   its middle is a picture or scrolls by itself, so nothing runs under the bar.
 * - `none`: a full-bleed moment, or a sheet. Its corner controls are drawn by the screen, in the
 *   bar's place.
 */
export type RouteBar = 'page' | 'frame' | 'none';

const ROUTE_BAR: Readonly<Record<string, RouteBar>> = {
  settings: 'page',
  'finish-with': 'page',
  privacy: 'page',
  helplines: 'page',
  account: 'page',
  friends: 'page',
  'table/index': 'page',
  'table/seat': 'page',
  'table-settings': 'page',
  'table-quieted': 'page',
  't/[code]': 'page',
  'f/[code]': 'page',
  world: 'frame',
  zoo: 'frame',
  record: 'frame',
  shelf: 'frame',
  'plus/manage': 'frame',
  'plus/records': 'frame',
};

/**
 * The bar a route wears. Only a pushed screen can wear one: a moment that cannot be swiped away and
 * a sheet never do, whatever the table says. Without the system's bar (`systemBar` false: not iOS)
 * every screen draws its own.
 */
export function routeBar(routeName: string, systemBar: boolean): RouteBar {
  if (!systemBar || routeMotion(routeName) !== 'push') return 'none';
  return ROUTE_BAR[routeName] ?? 'none';
}

export interface BarInks {
  readonly page: string;
  readonly ink: string;
  readonly appearance: 'light' | 'dark';
  /** The heading face, for the bar's title. */
  readonly titleFont: string;
}

export interface StackBarOptions {
  readonly headerShown: boolean;
  readonly title?: string;
  readonly headerTransparent?: boolean;
  readonly headerBackVisible?: boolean;
  readonly headerShadowVisible?: boolean;
  readonly headerTintColor?: string;
  readonly headerUserInterfaceStyle?: 'light' | 'dark';
  readonly headerStyle?: { readonly backgroundColor: string };
  readonly headerTitleStyle?: BarTitleStyle;
}

interface BarTitleStyle {
  readonly fontFamily: string;
  readonly fontWeight: '700';
  readonly color: string;
}

/**
 * The native stack's header options for one route, set before the screen is drawn so the bar is
 * there from its first frame. The screen itself fills in the title and the close control. The
 * system's back chevron is never shown: every screen closes from the trailing corner, and a pushed
 * screen can also be swiped back.
 */
export function stackBar(routeName: string, systemBar: boolean, inks: BarInks): StackBarOptions {
  const bar = routeBar(routeName, systemBar);
  if (bar === 'none') return { headerShown: false };
  const titleStyle: BarTitleStyle = {
    fontFamily: inks.titleFont,
    fontWeight: '700',
    color: inks.ink,
  };
  const shared = {
    headerShown: true,
    title: '',
    headerBackVisible: false,
    headerShadowVisible: false,
    headerTintColor: inks.ink,
    headerUserInterfaceStyle: inks.appearance,
    headerTitleStyle: titleStyle,
  } as const;
  // Every bar is solid, in the page's colour. A see-through bar left its title standing over
  // whatever scrolled beneath it on a phone: the page is always under the bar, never behind it.
  const solid = {
    ...shared,
    headerTransparent: false,
    headerStyle: { backgroundColor: inks.page },
  } as const;
  // A page's large title is the page's own: it scrolls, shrinks and fades with the list, and the
  // bar takes it up small once it has gone. The system's large title is never asked for.
  return solid;
}
