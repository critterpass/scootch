import { describe, expect, it } from '@jest/globals';

import { sentWordsAreStale } from './use-sent-words';

describe('how long the sent words are kept for the reveal', () => {
  it('keeps them while Scootch is choosing, through the battery question, and on the one thing', () => {
    expect(sentWordsAreStale('composer', false, false)).toBe(false);
    expect(sentWordsAreStale('energy', false, false)).toBe(false);
    expect(sentWordsAreStale('one_thing', false, false)).toBe(false);
  });

  it('lets go of them when what came back was not a one thing to reveal', () => {
    // A serious task is set plainly, with no reveal.
    expect(sentWordsAreStale('task_set', false, false)).toBe(true);
    expect(sentWordsAreStale('hatch', false, false)).toBe(true);
    expect(sentWordsAreStale('done', false, false)).toBe(true);
  });

  it('lets go of them when the wait was cancelled or the words were turned away', () => {
    expect(sentWordsAreStale('composer', true, false)).toBe(true);
    expect(sentWordsAreStale('composer', false, true)).toBe(true);
  });
});
