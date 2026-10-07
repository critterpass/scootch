import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { goBack } from './go-back';
import { feelFor } from './may-move';
import { ROUTE_MOTION, routeBar, routeMotion, stackBar, stackMotion } from './stack-transitions';

const APP = join(__dirname, '..', '..', 'app');

/** The route names the root stack sees: files by path, and a group folder with its own layout. */
function rootRoutes(dir = APP): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry.startsWith('(')) names.push(entry);
      else names.push(...rootRoutes(path));
    } else if (entry.endsWith('.tsx') && !entry.startsWith('_')) {
      names.push(relative(APP, path).replace(/\.tsx$/, ''));
    }
  }
  return names;
}

describe('how each route arrives and leaves', () => {
  it('names every route of the app, so none is moved by accident', () => {
    expect(rootRoutes().sort()).toEqual(Object.keys(ROUTE_MOTION).sort());
  });

  it('lets a person swipe back from the world, the zoo, the record, settings and their children', () => {
    const swipedBack = [
      'world',
      'zoo',
      'record',
      'shelf',
      'settings',
      'finish-with',
      'privacy',
      'helplines',
      'plus/manage',
      'plus/records',
    ];
    for (const route of swipedBack) {
      expect(stackMotion(route, true)).toMatchObject({
        animation: 'default',
        presentation: 'card',
        gestureEnabled: true,
      });
    }
  });

  it('lets a page of rows be swiped back from anywhere, and a picture only from its edge', () => {
    for (const route of ['settings', 'privacy', 'helplines', 'finish-with']) {
      expect(stackMotion(route, true).fullScreenGestureEnabled).toBe(true);
    }
    // The island, the binder and the disc are dragged sideways themselves.
    for (const route of ['world', 'zoo', 'record']) {
      expect(stackMotion(route, true).fullScreenGestureEnabled).toBe(false);
    }
  });

  it('presents the Plus sheet and a haunt as system sheets with a grabber, pulled down to close', () => {
    for (const route of ['plus/index', 'haunt/send', 'haunt/received']) {
      expect(stackMotion(route, true)).toMatchObject({
        presentation: 'formSheet',
        gestureEnabled: true,
        sheetGrabberVisible: true,
        sheetAllowedDetents: [1],
      });
    }
  });

  it('fades into the session and the reveal, which cannot be swiped away', () => {
    for (const route of ['session', 'reveal']) {
      expect(stackMotion(route, true)).toMatchObject({ animation: 'fade', gestureEnabled: false });
    }
  });

  it('cannot be swiped out of mid-session: leaving goes through the close control and its question', () => {
    expect(stackMotion('session', true).gestureEnabled).toBe(false);
    expect(stackMotion('session', false).gestureEnabled).toBe(false);
  });

  it('never lets a session, the reveal, a purchase moment or care be swiped away, moving or not', () => {
    const held = Object.keys(ROUTE_MOTION).filter((route) =>
      ['fade', 'none'].includes(routeMotion(route)),
    );
    expect(held).toEqual(expect.arrayContaining(['session', 'reveal', 'care']));
    for (const route of held) {
      for (const mayMove of [true, false]) {
        const options = stackMotion(route, mayMove);
        expect(options.gestureEnabled).toBe(false);
        expect(options.fullScreenGestureEnabled).toBe(false);
        expect(options.presentation).toBe('card');
      }
    }
  });

  it('plays nothing on the way into care', () => {
    expect(stackMotion('care', true)).toMatchObject({ animation: 'none', gestureEnabled: false });
    expect(routeMotion('care')).toBe('none');
  });

  it('only crossfades where nothing may move, and still lets a person go back', () => {
    for (const route of Object.keys(ROUTE_MOTION)) {
      const { animation } = stackMotion(route, false);
      expect(['fade', 'none']).toContain(animation);
    }
    expect(stackMotion('settings', false).gestureEnabled).toBe(true);
  });

  it('reads a return to the one screen or the world as going back', () => {
    expect(stackMotion('index', true).animationTypeForReplace).toBe('pop');
    expect(stackMotion('world', true).animationTypeForReplace).toBe('pop');
    expect(stackMotion('zoo', true).animationTypeForReplace).toBe('push');
  });
});

describe("which screens wear the system's bar", () => {
  const inks = { page: '#EEE', ink: '#111', appearance: 'dark', titleFont: 'ui-rounded' } as const;

  it('gives settings and its pages a see-through bar that the list scrolls under', () => {
    for (const route of ['settings', 'privacy', 'helplines', 'finish-with', 'account']) {
      expect(routeBar(route, true)).toBe('page');
      expect(stackBar(route, true, inks)).toMatchObject({
        headerShown: true,
        headerTransparent: true,
        headerBackVisible: false,
        headerUserInterfaceStyle: 'dark',
      });
    }
  });

  it('collapses a large title on the pages the boards draw with one', () => {
    expect(stackBar('privacy', true, inks).headerLargeTitle).toBe(true);
    expect(stackBar('settings', true, inks).headerLargeTitle).toBe(false);
  });

  it("gives the world, the zoo and the record a bar in the page's colour", () => {
    for (const route of ['world', 'zoo', 'record', 'shelf', 'plus/manage']) {
      expect(stackBar(route, true, inks)).toMatchObject({
        headerShown: true,
        headerTransparent: false,
        headerStyle: { backgroundColor: '#EEE' },
      });
    }
  });

  it('leaves the one screen, the session, the reveal, care and every sheet without a bar', () => {
    const bare = Object.keys(ROUTE_MOTION).filter((route) => routeMotion(route) !== 'push');
    expect(bare).toEqual(
      expect.arrayContaining(['index', 'session', 'reveal', 'care', 'plus/index', 'haunt/send']),
    );
    for (const route of bare) {
      expect(stackBar(route, true, inks)).toEqual({ headerShown: false });
    }
  });

  it('only gives a bar to a screen that can also be swiped back, so no bar is the only way out', () => {
    for (const route of Object.keys(ROUTE_MOTION)) {
      if (routeBar(route, true) === 'none') continue;
      expect(stackMotion(route, true).gestureEnabled).toBe(true);
      expect(stackMotion(route, false).gestureEnabled).toBe(true);
    }
  });

  it('draws every corner itself where there is no system bar', () => {
    for (const route of Object.keys(ROUTE_MOTION)) {
      expect(stackBar(route, false, inks)).toEqual({ headerShown: false });
    }
  });
});

describe('the Motion switch and the stack', () => {
  const facts = { systemReducedMotion: false, captured: false, care: 'none' } as const;

  it('calms every transition when the switch is set to calm', () => {
    const { mayMove } = feelFor({ ...facts, motion: 'calm' });
    for (const route of Object.keys(ROUTE_MOTION)) {
      expect(['fade', 'none']).toContain(stackMotion(route, mayMove).animation);
    }
  });

  it("lets the system's push play when the switch is set to full", () => {
    const { mayMove } = feelFor({ ...facts, motion: 'full' });
    expect(stackMotion('settings', mayMove).animation).toBe('default');
  });

  it('holds the stack still around a serious task and on a crisis day', () => {
    for (const care of ['serious', 'crisis'] as const) {
      const { mayMove } = feelFor({ ...facts, motion: 'full', care });
      expect(stackMotion('world', mayMove).animation).toBe('fade');
    }
  });
});

describe('closing a screen', () => {
  const router = (canGoBack: boolean) => {
    const calls: string[] = [];
    return {
      calls,
      canGoBack: () => canGoBack,
      back: () => void calls.push('back'),
      replace: (href: unknown) => void calls.push(`replace ${String(href)}`),
    };
  };

  it('goes back along the stack when there is a screen underneath', () => {
    const opened = router(true);
    goBack(opened, '/');
    expect(opened.calls).toEqual(['back']);
  });

  it('goes to its fallback when it was opened with nothing under it', () => {
    const alone = router(false);
    goBack(alone, '/settings');
    expect(alone.calls).toEqual(['replace /settings']);
  });
});

/** A stack that moves as the router's documents say push, replace, back and dismissTo do. */
function walk(start: string[]) {
  const stack = [...start];
  const router = {
    stack,
    push: (href: string) => void stack.push(href),
    replace: (href: string) => void stack.splice(stack.length - 1, 1, href),
    canGoBack: () => stack.length > 1,
    back: () => void stack.pop(),
    dismissTo: (href: string) => {
      const at = stack.lastIndexOf(href);
      if (at >= 0) stack.splice(at + 1);
      else stack.splice(stack.length - 1, 1, href);
    },
  };
  return router;
}

describe('the paths a new person walks', () => {
  it('goes from the one screen to the session, the reveal and home again, leaving one home', () => {
    const router = walk(['/']);
    router.push('/session');
    router.replace('/reveal');
    // The reveal hands back to the session for the treat and the parked thoughts.
    router.replace('/session');
    router.dismissTo('/');
    expect(router.stack).toEqual(['/']);
  });

  it('comes home from a session the app was reopened into, with nothing under it', () => {
    const router = walk(['/session']);
    router.dismissTo('/');
    expect(router.stack).toEqual(['/']);
  });

  it('opens Settings and a page of it, and closes each back to where it came from', () => {
    const router = walk(['/']);
    router.push('/settings');
    router.push('/privacy');
    goBack(router, '/settings');
    expect(router.stack).toEqual(['/', '/settings']);
    goBack(router, '/');
    expect(router.stack).toEqual(['/']);
  });

  it('opens the world, the record inside it, and closes the record back to the world', () => {
    const pushed = walk(['/']);
    pushed.push('/world');
    pushed.push('/record');
    pushed.dismissTo('/world');
    expect(pushed.stack).toEqual(['/', '/world']);

    // The world's own buttons replace it with its child: closing the child is still the world.
    const replaced = walk(['/', '/world']);
    replaced.replace('/zoo');
    replaced.dismissTo('/world');
    expect(replaced.stack).toEqual(['/', '/world']);
  });
});
