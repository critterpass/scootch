import { describe, expect, it } from '@jest/globals';

import {
  composerReducer,
  initialComposer,
  type ComposerEffect,
  type ComposerEvent,
  type ComposerState,
} from './composer-machine';

/** Runs events in order and collects every effect asked for on the way. */
function run(start: ComposerState, events: readonly ComposerEvent[]) {
  const effects: ComposerEffect[] = [];
  let state = start;
  for (const event of events) {
    const step = composerReducer(state, event);
    state = step.state;
    effects.push(...step.effects);
  }
  return { state, effects, sent: effects.filter((effect) => effect.kind === 'send') };
}

const ready = initialComposer('ready');

describe('hold to talk', () => {
  it('listens while held and sends what was heard when let go', () => {
    const { state, effects, sent } = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'heard', transcript: 'reply to one' },
      { type: 'heard', transcript: 'reply to one message' },
      { type: 'released', at: 4000 },
      { type: 'recognition_ended', transcript: 'reply to one message' },
    ]);

    expect(effects.map((effect) => effect.kind)).toEqual([
      'tick',
      'start_listening',
      'stop_listening',
      'send',
    ]);
    expect(sent).toEqual([{ kind: 'send', text: 'reply to one message', source: 'ramble' }]);
    expect(state.phase).toBe('sending');
    expect(run(state, [{ type: 'sent' }]).state.phase).toBe('idle');
  });

  it('shows the words as they are heard and keeps the start time for the timer', () => {
    const { state } = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'heard', transcript: 'reply to' },
    ]);

    expect(state).toMatchObject({ phase: 'listening', transcript: 'reply to', startedAt: 1000 });
  });

  it('sends nothing when the finger slides left and lets go', () => {
    const { state, effects, sent } = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'heard', transcript: 'never mind this' },
      { type: 'slid', dx: -120 },
      { type: 'released', at: 5000 },
      // The recogniser still reports its end after an abort.
      { type: 'recognition_ended', transcript: 'never mind this' },
    ]);

    expect(sent).toEqual([]);
    expect(effects.at(-1)).toEqual({ kind: 'abort_listening' });
    expect(state).toMatchObject({ phase: 'idle', notice: 'cancelled', transcript: '' });
  });

  it('disarms the cancel when the finger slides back', () => {
    const { state, sent } = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'slid', dx: -120 },
      { type: 'slid', dx: -20 },
      { type: 'released', at: 5000 },
      { type: 'recognition_ended', transcript: 'drink some water' },
    ]);

    expect(state.armed).toBe(false);
    expect(sent).toEqual([{ kind: 'send', text: 'drink some water', source: 'ramble' }]);
  });

  it('treats a tap as a tap: nothing is sent and the hint says to hold', () => {
    const { state, sent, effects } = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'released', at: 1200 },
    ]);

    expect(sent).toEqual([]);
    expect(effects.at(-1)).toEqual({ kind: 'abort_listening' });
    expect(state).toMatchObject({ phase: 'idle', notice: 'too_short' });
  });

  it('sends nothing for a silent recording and shows the empty state', () => {
    const silent = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'released', at: 6000 },
      { type: 'recognition_ended', transcript: '   ' },
    ]);
    const noSpeech = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'released', at: 6000 },
      { type: 'recognition_failed', reason: 'nothing' },
    ]);

    for (const { state, sent } of [silent, noSpeech]) {
      expect(sent).toEqual([]);
      expect(state).toMatchObject({ phase: 'idle', notice: 'empty' });
    }
  });

  it('asks the system first when it has never asked, and listens only once allowed', () => {
    const asked = run(initialComposer('unasked'), [{ type: 'hold_started', at: 1000 }]);
    expect(asked.effects).toEqual([{ kind: 'ask_to_listen' }]);
    expect(asked.state.phase).toBe('idle');

    const allowed = run(asked.state, [
      { type: 'voice_status', status: 'ready' },
      { type: 'hold_started', at: 9000 },
    ]);
    expect(allowed.state.phase).toBe('listening');
  });
});

describe('the alternative to holding', () => {
  it('starts on one tap and sends on the next, however short the recording', () => {
    const { state, effects, sent } = run(ready, [
      { type: 'toggled', at: 1000 },
      { type: 'heard', transcript: 'open the scary email' },
      { type: 'toggled', at: 1100 },
      { type: 'recognition_ended', transcript: 'open the scary email' },
    ]);

    expect(effects.map((effect) => effect.kind)).toEqual([
      'tick',
      'start_listening',
      'stop_listening',
      'send',
    ]);
    expect(sent).toEqual([{ kind: 'send', text: 'open the scary email', source: 'ramble' }]);
    expect(state.phase).toBe('sending');
  });

  it('cancels from its own button and sends nothing', () => {
    const { state, sent } = run(ready, [
      { type: 'toggled', at: 1000 },
      { type: 'heard', transcript: 'not this' },
      { type: 'cancel_tapped' },
    ]);

    expect(sent).toEqual([]);
    expect(state).toMatchObject({ phase: 'idle', notice: 'cancelled' });
  });
});

describe('typing', () => {
  it('turns the capsule into a field, sends the trimmed text and empties the field', () => {
    const { state, sent } = run(ready, [
      { type: 'keyboard_tapped' },
      { type: 'text_changed', text: '  reply to one message ' },
      { type: 'send_tapped' },
    ]);

    expect(sent).toEqual([{ kind: 'send', text: 'reply to one message', source: 'typed' }]);
    expect(state).toMatchObject({ mode: 'typing', phase: 'sending', text: '' });
  });

  it('sends nothing while the field is empty, and nothing twice', () => {
    const empty = run(ready, [
      { type: 'keyboard_tapped' },
      { type: 'text_changed', text: '   ' },
      { type: 'send_tapped' },
    ]);
    expect(empty.sent).toEqual([]);

    const twice = run(ready, [
      { type: 'keyboard_tapped' },
      { type: 'text_changed', text: 'drink some water' },
      { type: 'send_tapped' },
      { type: 'send_tapped' },
    ]);
    expect(twice.sent).toHaveLength(1);
  });

  it('switches back to voice from the same button', () => {
    const { state } = run(ready, [{ type: 'keyboard_tapped' }, { type: 'voice_tapped' }]);
    expect(state.mode).toBe('voice');
  });

  it('goes back to hold-to-talk when the keyboard is put away with nothing typed', () => {
    const empty = run(ready, [{ type: 'keyboard_tapped' }, { type: 'keyboard_dismissed' }]);
    expect(empty.state).toMatchObject({ mode: 'voice', phase: 'idle', text: '' });
    const spaces = run(ready, [
      { type: 'keyboard_tapped' },
      { type: 'text_changed', text: '  ' },
      { type: 'keyboard_dismissed' },
    ]);
    expect(spaces.state).toMatchObject({ mode: 'voice', text: '' });
  });

  it('keeps the field when the keyboard is put away over typed words, or mid-send', () => {
    const typed = run(ready, [
      { type: 'keyboard_tapped' },
      { type: 'text_changed', text: 'drink some water' },
      { type: 'keyboard_dismissed' },
    ]);
    expect(typed.state).toMatchObject({ mode: 'typing', text: 'drink some water' });
    expect(typed.sent).toEqual([]);

    const sending = run(ready, [
      { type: 'keyboard_tapped' },
      { type: 'text_changed', text: 'drink some water' },
      { type: 'send_tapped' },
      { type: 'keyboard_dismissed' },
    ]);
    expect(sending.state).toMatchObject({ mode: 'typing', phase: 'sending' });
  });

  it('stays a field without a microphone, however the keyboard goes', () => {
    const { state } = run(initialComposer('refused'), [{ type: 'keyboard_dismissed' }]);
    expect(state.mode).toBe('typing');
  });
});

describe('without a microphone', () => {
  it.each(['refused', 'unavailable'] as const)(
    'is a text field that works in full when voice is %s',
    (status) => {
      const start = initialComposer(status);
      expect(start.mode).toBe('typing');

      const { state, effects, sent } = run(start, [
        { type: 'voice_tapped' },
        { type: 'hold_started', at: 1000 },
        { type: 'toggled', at: 2000 },
        { type: 'text_changed', text: 'reply to one message' },
        { type: 'send_tapped' },
      ]);

      // Nothing ever listens or asks the system again.
      expect(effects).toEqual([{ kind: 'send', text: 'reply to one message', source: 'typed' }]);
      expect(sent).toHaveLength(1);
      expect(state).toMatchObject({ mode: 'typing', voice: status });
    },
  );

  it('falls back to typing when the system prompt is refused, keeping what was typed', () => {
    const { state, sent } = run(initialComposer('unasked'), [
      { type: 'hold_started', at: 1000 },
      { type: 'voice_status', status: 'refused' },
      { type: 'text_changed', text: 'drink some water' },
      { type: 'send_tapped' },
    ]);

    expect(state).toMatchObject({ mode: 'typing', voice: 'refused' });
    expect(sent).toEqual([{ kind: 'send', text: 'drink some water', source: 'typed' }]);
  });

  it('stops a recording and goes to typing when the phone cannot transcribe the language', () => {
    const { state, sent } = run(ready, [
      { type: 'hold_started', at: 1000 },
      { type: 'recognition_failed', reason: 'unavailable' },
    ]);

    expect(sent).toEqual([]);
    expect(state).toMatchObject({ mode: 'typing', phase: 'idle', voice: 'unavailable' });
  });
});

describe('a recogniser that stops by itself', () => {
  const heardSoFar: ComposerEvent[] = [
    { type: 'hold_started', at: 1000 },
    { type: 'heard', transcript: 'ring the dentist and also' },
  ];

  it.each(['nothing', 'unavailable', 'refused'] as const)(
    'keeps what was heard when it fails mid-ramble (%s): the words are in the field',
    (reason) => {
      const { state, sent } = run(ready, [...heardSoFar, { type: 'recognition_failed', reason }]);
      expect(sent).toEqual([]);
      expect(state).toMatchObject({
        phase: 'idle',
        mode: 'typing',
        text: 'ring the dentist and also',
        transcript: '',
      });
      // From there they can be sent, edited or cleared like anything typed.
      expect(run(state, [{ type: 'send_tapped' }]).sent).toEqual([
        { kind: 'send', text: 'ring the dentist and also', source: 'typed' },
      ]);
    },
  );

  it('keeps what was heard when it fails after the finger lifted', () => {
    const { state, sent } = run(ready, [
      ...heardSoFar,
      { type: 'released', at: 5000 },
      { type: 'recognition_failed', reason: 'nothing' },
    ]);
    expect(sent).toEqual([]);
    expect(state).toMatchObject({ mode: 'typing', text: 'ring the dentist and also' });
  });

  it('does not send while the finger is still down: the words wait in the field', () => {
    const { state, sent } = run(ready, [
      ...heardSoFar,
      { type: 'recognition_ended', transcript: 'ring the dentist and also' },
    ]);
    expect(sent).toEqual([]);
    expect(state).toMatchObject({
      phase: 'idle',
      mode: 'typing',
      text: 'ring the dentist and also',
    });
    // Letting go afterwards sends nothing either.
    expect(run(state, [{ type: 'released', at: 9000 }]).sent).toEqual([]);
  });

  it('adds what was heard after anything already typed', () => {
    const typed = { ...ready, text: 'first this' };
    const { state } = run(typed, [
      ...heardSoFar,
      { type: 'recognition_failed', reason: 'nothing' },
    ]);
    expect(state.text).toBe('first this ring the dentist and also');
  });
});
