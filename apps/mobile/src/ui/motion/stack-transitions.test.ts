import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { goBack } from './go-back';
import { ROUTE_MOTION, routeMotion, stackMotion } from './stack-transitions';

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

  it('presents the Plus sheet as a sheet that is pulled down to close', () => {
    expect(stackMotion('plus/index', true)).toMatchObject({
      presentation: 'modal',
      gestureEnabled: true,
    });
  });

  it('fades into the session and the reveal, which cannot be swiped away', () => {
    for (const route of ['session', 'reveal']) {
      expect(stackMotion(route, true)).toMatchObject({ animation: 'fade', gestureEnabled: false });
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
