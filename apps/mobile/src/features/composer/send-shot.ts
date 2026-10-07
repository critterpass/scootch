import type { ComposerState } from './composer-machine';

/**
 * What leaves the dock as one change of the composer's state happens: a recording let go to be
 * sent (`text` is `null`: its words are not on the dock), or a typed thing with its words. `null`
 * for everything else: a cancel, a hold too short to count, a chip sent without being typed.
 */
export function shotFor(
  was: ComposerState,
  now: ComposerState,
): { readonly text: string | null } | null {
  if (was.phase === 'listening' && now.phase === 'finishing') return { text: null };
  if (was.phase === 'idle' && now.phase === 'sending' && was.mode === 'typing') {
    const text = was.text.trim();
    return text === '' ? null : { text };
  }
  return null;
}
