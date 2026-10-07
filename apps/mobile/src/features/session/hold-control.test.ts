import { describe, expect, it } from '@jest/globals';

import type { SessionEvent } from '@scootch/domain';
import { t } from '@scootch/i18n';

import {
  CONFIRM_WINDOW_MS,
  HOLD_DRAIN_MS,
  HOLD_FILL_MS,
  holdControl,
  holdReducer,
  startsOverAfterAnswer,
  type HoldControl,
  type HoldInput,
} from './hold-control';

/** Feeds inputs through the control and collects every session event it asks for. */
function play(start: HoldControl, inputs: readonly HoldInput[]) {
  let control = start;
  const sent: SessionEvent['type'][] = [];
  for (const input of inputs) {
    const step = holdReducer(control, input);
    control = step.control;
    sent.push(...step.send.map((event) => event.type));
  }
  return { control, sent };
}

const frames = (totalMs: number, each = 16): HoldInput[] =>
  Array.from({ length: Math.ceil(totalMs / each) }, () => ({ type: 'frame', elapsedMs: each }));

describe('the finish control', () => {
  it('finishes when the hold reaches the end, once', () => {
    const { control, sent } = play(holdControl('hold'), [
      { type: 'pressed' },
      ...frames(HOLD_FILL_MS + 100),
      { type: 'released' },
      { type: 'pressed' },
    ]);
    expect(sent).toEqual(['hold_started', 'hold_completed']);
    expect(control).toMatchObject({ finished: true, progress: 1 });
  });

  it('does not finish when let go early: the ring drains and the caption stays kind', () => {
    const held = play(holdControl('hold'), [
      { type: 'pressed' },
      ...frames(HOLD_FILL_MS * 0.6),
      { type: 'released' },
    ]);
    expect(held.sent).toEqual(['hold_started', 'hold_released']);
    expect(held.control).toMatchObject({ finished: false, holding: false, caption: 'nearly' });
    expect(held.control.progress).toBeGreaterThan(0.5);

    const drained = play(held.control, frames(HOLD_DRAIN_MS + 50));
    expect(drained.sent).toEqual([]);
    expect(drained.control).toMatchObject({ progress: 0, finished: false });

    // What is said after letting go has no blame in it, and a second go works as the first did.
    expect(t('en', 'session.finish.holdNearly')).not.toMatch(
      /fail|missed|wrong|too (early|soon)|lazy|behind|again|streak|should/i,
    );
    const again = play(drained.control, [{ type: 'pressed' }, ...frames(HOLD_FILL_MS + 100)]);
    expect(again.sent).toEqual(['hold_started', 'hold_completed']);
  });

  it('says nothing about a brush that barely touched the button', () => {
    const { control } = play(holdControl('hold'), [
      { type: 'pressed' },
      ...frames(60),
      { type: 'released' },
    ]);
    expect(control.caption).toBe('idle');
  });

  it('needs both taps to finish by tapping twice', () => {
    const first = play(holdControl('double_tap'), [{ type: 'tapped', at: 1000 }]);
    expect(first.sent).toEqual([]);
    expect(first.control).toMatchObject({ finished: false, caption: 'confirm' });

    const second = play(first.control, [{ type: 'tapped', at: 1800 }]);
    expect(second.sent).toEqual(['double_tapped']);
    expect(second.control.finished).toBe(true);
  });

  it('forgets a first tap that was never confirmed', () => {
    const late = play(holdControl('double_tap'), [
      { type: 'tapped', at: 1000 },
      { type: 'tapped', at: 1000 + CONFIRM_WINDOW_MS + 1 },
    ]);
    expect(late.sent).toEqual([]);
    expect(late.control.finished).toBe(false);
  });

  it('never fills the tap-twice control by pressing it', () => {
    const { control, sent } = play(holdControl('double_tap'), [
      { type: 'pressed' },
      ...frames(HOLD_FILL_MS * 2),
    ]);
    expect(sent).toEqual([]);
    expect(control.progress).toBe(0);
  });

  it('lets VoiceOver finish the hold control with two activations instead of a hold', () => {
    const { sent } = play(holdControl('hold'), [
      { type: 'tapped', at: 0 },
      { type: 'tapped', at: 900 },
    ]);
    expect(sent).toEqual(['double_tapped']);
  });
});

describe('a finish the store did not take', () => {
  it('leaves the control ready to be used again once the store has answered', () => {
    let state = holdControl('hold');
    state = holdReducer(state, { type: 'pressed' }).control;
    state = holdReducer(state, { type: 'frame', elapsedMs: HOLD_FILL_MS }).control;
    expect(state.finished).toBe(true);
    // Latched while the answer is on its way: nothing is sent twice.
    expect(holdReducer(state, { type: 'pressed' }).send).toEqual([]);

    state = holdReducer(state, { type: 'settled' }).control;
    expect(state).toEqual(holdControl('hold'));
    expect(holdReducer(state, { type: 'pressed' }).send).toEqual([{ type: 'hold_started' }]);
  });

  it('does the same for tap twice, and changes nothing on a control that has not finished', () => {
    let state = holdControl('double_tap');
    state = holdReducer(state, { type: 'tapped', at: 0 }).control;
    expect(holdReducer(state, { type: 'settled' }).control).toBe(state);
    state = holdReducer(state, { type: 'tapped', at: 500 }).control;
    expect(state.finished).toBe(true);
    expect(holdReducer(state, { type: 'settled' }).control).toEqual(holdControl('double_tap'));
  });

  it('keeps the ring full while the catch plays, and resets only a control left on the screen', () => {
    let state = holdControl('hold');
    state = holdReducer(state, { type: 'pressed' }).control;
    state = holdReducer(state, { type: 'frame', elapsedMs: HOLD_FILL_MS }).control;
    // Taken: the catch is playing on this screen, so nothing is settled and the ring stays full.
    expect(startsOverAfterAnswer({ onScreen: true, taken: true })).toBe(false);
    expect(state.progress).toBe(1);
    expect(holdReducer(state, { type: 'frame', elapsedMs: 5000 }).control.progress).toBe(1);
    expect(holdReducer(state, { type: 'released' }).control.progress).toBe(1);
    // Refused: still on the screen and not taken, so it starts over.
    expect(startsOverAfterAnswer({ onScreen: true, taken: false })).toBe(true);
    // Gone: nothing to reset.
    expect(startsOverAfterAnswer({ onScreen: false, taken: false })).toBe(false);
  });
});
