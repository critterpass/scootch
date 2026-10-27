import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { goBack } from './go-back';
import { feelFor } from './may-move';
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

  it('holds the desk in place: it is never swiped away', () => {
    expect(routeMotion('index')).toBe('home');
    for (const mayMove of [true, false]) {
      expect(stackMotion('index', mayMove)).toMatchObject({
        presentation: 'card',
        gestureEnabled: false,
      });
    }
  });

  it('pushes a route it does not name, with the swipe back', () => {
    expect(routeMotion('a-page-nobody-named')).toBe('push');
    expect(stackMotion('a-page-nobody-named', true)).toMatchObject({
      animation: 'default',
      presentation: 'card',
      gestureEnabled: true,
      fullScreenGestureEnabled: false,
    });
  });

  it('only crossfades where nothing may move, and still lets a person go back', () => {
    for (const route of Object.keys(ROUTE_MOTION)) {
      const { animation } = stackMotion(route, false);
      expect(['fade', 'none']).toContain(animation);
    }
    expect(stackMotion('(dev)', false).gestureEnabled).toBe(true);
  });

  it('lays the pulled screens over the one beneath, see-through, with nothing played by the system', () => {
    for (const route of ['board', 'logbook', 'timetable']) {
      expect(routeMotion(route)).toBe('over');
      for (const mayMove of [true, false]) {
        expect(stackMotion(route, mayMove)).toEqual({
          animation: 'none',
          presentation: 'transparentModal',
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
          animationTypeForReplace: 'push',
          contentStyle: { backgroundColor: 'transparent' },
        });
      }
    }
  });

  it('presents a page opened from a pulled screen above it, never under it', () => {
    // The report card opens from the logbook; tuition from the timetable.
    for (const route of ['report-card', 'tuition/index']) {
      expect(stackMotion(route, true).presentation).not.toBe('card');
      expect(stackMotion(route, false).presentation).not.toBe('card');
    }
  });

  it('reads a return to the desk as going back', () => {
    expect(stackMotion('index', true).animationTypeForReplace).toBe('pop');
    expect(stackMotion('(dev)', true).animationTypeForReplace).toBe('push');
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
    expect(stackMotion('(dev)', mayMove).animation).toBe('default');
  });

  it('holds the stack still around a serious task and on a crisis day', () => {
    for (const care of ['serious', 'crisis'] as const) {
      const { mayMove } = feelFor({ ...facts, motion: 'full', care });
      expect(stackMotion('(dev)', mayMove).animation).toBe('fade');
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
    goBack(alone, '/');
    expect(alone.calls).toEqual(['replace /']);
  });
});
