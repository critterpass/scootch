import { describe, expect, it } from '@jest/globals';

import { composerReducer, initialComposer } from '../../composer/composer-machine';

import { parkDraft, sessionClosing } from './park-draft';

describe('what the park field holds', () => {
  it('is the typed words, trimmed', () => {
    const typing = composerReducer(initialComposer('refused'), {
      type: 'text_changed',
      text: '  Bin bags ',
    }).state;
    expect(parkDraft(typing)).toBe('Bin bags');
  });

  it('is what has been heard so far while a recording is under way', () => {
    let state = composerReducer(initialComposer('ready'), { type: 'hold_started', at: 0 }).state;
    state = composerReducer(state, { type: 'heard', transcript: 'call mum back' }).state;
    expect(parkDraft(state)).toBe('call mum back');
    // Let go, and still waiting for the last words: nothing heard is dropped.
    state = composerReducer(state, { type: 'released', at: 2000 }).state;
    expect(state.phase).toBe('finishing');
    expect(parkDraft(state)).toBe('call mum back');
  });

  it('is nothing when nothing was typed or heard', () => {
    expect(parkDraft(initialComposer('ready'))).toBe('');
  });
});

describe('the last seconds of a session', () => {
  it('hands the field over three seconds before the end and not before', () => {
    const tenMinutes = 10;
    expect(sessionClosing(4 / 600, tenMinutes)).toBe(false);
    expect(sessionClosing(3 / 600, tenMinutes)).toBe(true);
    expect(sessionClosing(0, tenMinutes)).toBe(true);
    expect(sessionClosing(0.7, tenMinutes)).toBe(false);
  });
});
