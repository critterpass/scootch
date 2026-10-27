import { describe, expect, it } from '@jest/globals';

import { ROUTE_MOTION } from '../motion/stack-transitions';

import { DUO, foldLayout } from './fold-layout';
import { statusClear } from './status-clear';

const none = { top: 0, right: 0, bottom: 0, left: 0 };
const closed = foldLayout(DUO.outer, DUO.outer, null, none);
const phone = foldLayout({ width: 402, height: 874 }, { width: 402, height: 874 }, null, none);

/** Routes with a Duo layout of their own, or none to clear (the registry draws its captures). */
const OWN_LAYOUT = new Set([
  'index',
  'session',
  'board',
  'logbook',
  'timetable',
  'first-day/index',
  '(dev)',
]);

describe('keeping clear of the Duo status column', () => {
  it('moves every phone-laid-out route clear of it on the Duo', () => {
    for (const route of Object.keys(ROUTE_MOTION)) {
      expect([route, statusClear(route, closed)]).toEqual([
        route,
        OWN_LAYOUT.has(route) ? 0 : DUO.column,
      ]);
    }
  });

  it('changes nothing on a phone', () => {
    for (const route of Object.keys(ROUTE_MOTION)) expect(statusClear(route, phone)).toBe(0);
  });
});
