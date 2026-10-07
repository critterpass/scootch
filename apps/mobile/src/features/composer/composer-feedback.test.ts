import { describe, expect, it } from '@jest/globals';

import { composerFeedback, type ComposerFeedback } from './composer-feedback';
import { composerReducer, initialComposer, type ComposerEvent } from './composer-machine';

/** Runs events through the real machine and collects what each change sounds like. */
function heard(events: readonly ComposerEvent[], voice: 'ready' | 'unasked' = 'ready') {
  const feedback: ComposerFeedback[] = [];
  let state = initialComposer(voice);
  for (const event of events) {
    const next = composerReducer(state, event).state;
    feedback.push(...composerFeedback(state, next));
    state = next;
  }
  return feedback;
}

describe('what the composer sounds and feels like', () => {
  it('plays the listen sound as a hold begins and the send sound as the words go', () => {
    expect(
      heard([
        { type: 'hold_started', at: 0 },
        { type: 'heard', transcript: 'email the dentist' },
        { type: 'released', at: 2000 },
      ]),
    ).toEqual(['listen', 'send']);
  });

  it('taps once as the cancel arms, and plays the cancel sound in place of the send', () => {
    expect(
      heard([
        { type: 'hold_started', at: 0 },
        { type: 'slid', dx: -120 },
        { type: 'slid', dx: -130 },
        { type: 'released', at: 2000 },
      ]),
    ).toEqual(['listen', 'arm', 'cancel']);
  });

  it('sends nothing and plays no send sound for a hold that was only a tap', () => {
    const feedback = heard([
      { type: 'hold_started', at: 0 },
      { type: 'released', at: 200 },
    ]);
    expect(feedback).not.toContain('send');
    expect(feedback).not.toContain('cancel');
  });

  it('ticks for a switch to typing and back, and plays the send sound for typed words', () => {
    expect(
      heard([
        { type: 'keyboard_tapped' },
        { type: 'text_changed', text: 'water the plant' },
        { type: 'send_tapped' },
      ]),
    ).toEqual(['tick', 'send']);
    expect(heard([{ type: 'keyboard_tapped' }, { type: 'voice_tapped' }])).toEqual([
      'tick',
      'tick',
    ]);
  });

  it('stays silent when the phone itself moves the composer to typing', () => {
    expect(heard([{ type: 'voice_status', status: 'unavailable' }])).toEqual([]);
  });
});
