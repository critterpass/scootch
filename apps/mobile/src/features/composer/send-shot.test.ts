import { describe, expect, it } from '@jest/globals';

import { composerReducer, initialComposer, type ComposerEvent } from './composer-machine';
import { shotFor } from './send-shot';

/** Runs events through the real machine and collects what flew off the dock. */
function flown(events: readonly ComposerEvent[]) {
  const shots: (string | null)[] = [];
  let state = initialComposer('ready');
  for (const event of events) {
    const next = composerReducer(state, event).state;
    const shot = shotFor(state, next);
    if (shot !== null) shots.push(shot.text);
    state = next;
  }
  return shots;
}

describe('what flies from the dock to Scootch', () => {
  it('sends a recording off once, as the finger lets go', () => {
    expect(
      flown([
        { type: 'hold_started', at: 0 },
        { type: 'heard', transcript: 'email the dentist' },
        { type: 'released', at: 2000 },
        { type: 'recognition_ended', transcript: 'email the dentist' },
      ]),
    ).toEqual([null]);
  });

  it('sends nothing off for a cancel or a hold too short to count', () => {
    expect(
      flown([
        { type: 'hold_started', at: 0 },
        { type: 'slid', dx: -120 },
        { type: 'released', at: 2000 },
      ]),
    ).toEqual([]);
    expect(
      flown([
        { type: 'hold_started', at: 0 },
        { type: 'released', at: 100 },
      ]),
    ).toEqual([]);
  });

  it('sends typed words off as themselves', () => {
    expect(
      flown([
        { type: 'keyboard_tapped' },
        { type: 'text_changed', text: ' fix the wobbly shelf ' },
        { type: 'send_tapped' },
      ]),
    ).toEqual(['fix the wobbly shelf']);
  });
});
