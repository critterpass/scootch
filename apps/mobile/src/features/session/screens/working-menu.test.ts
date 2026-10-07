import { describe, expect, it } from '@jest/globals';

import { t as translate } from '@scootch/i18n';

import { fixtureModel, NO_ACTIONS } from '../registry/fixtures';
import { sessionInks } from '../ui/session-inks';

import type { SessionActions } from './screen-props';
import { workingMenu } from './working-menu';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
} as const;

function menuOf(changes: Parameters<typeof fixtureModel>[2], actions: SessionActions = NO_ACTIONS) {
  return workingMenu({
    model: fixtureModel('en', changes?.view ?? WORKING, changes),
    actions,
    inks: sessionInks('light'),
    t: (key, ...params) => translate('en', key, ...params),
  });
}

describe('the corner menu of a running session', () => {
  it('offers help first, then finishing, then stopping', () => {
    expect(menuOf({}).map((item) => item.testID)).toEqual([
      'session-stuck',
      'session-finish-early',
      'session-leave',
    ]);
  });

  it('sends each press to the action it always was', () => {
    const sent: string[] = [];
    const actions: SessionActions = {
      ...NO_ACTIONS,
      send: (event) => sent.push(event.type),
      finishEarly: () => sent.push('finishEarly'),
      leaveNow: () => sent.push('leaveNow'),
      // Stopping from the menu is said on purpose: it never falls back to the bare close.
      leave: () => sent.push('leave'),
    };
    for (const item of menuOf({}, actions)) item.onPress();
    expect(sent).toEqual(['stuck_tapped', 'finishEarly', 'leaveNow']);
  });

  it('does not offer help that is already on the screen', () => {
    const items = menuOf({ view: { ...WORKING, stuck: true } });
    expect(items.map((item) => item.testID)).toEqual(['session-finish-early', 'session-leave']);
  });

  it('holds the developer control only when it is armed', () => {
    expect(menuOf({ developerEnd: true }).at(-1)?.testID).toBe('session-developer-end');
  });
});
