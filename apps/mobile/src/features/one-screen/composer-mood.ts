import type { ScootchProps } from '../../art/Scootch';
import type { ComposerState } from '../composer/composer-machine';

type Mood = ScootchProps['mood'];

/**
 * How Scootch reacts to the composer: he listens, watches the typing, or thinks it over. Idle, he
 * waits; on the warm-up ask he listens instead, as the design draws it.
 */
export function composerMood(
  state: ComposerState,
  taskCall: 'idle' | 'waiting' | 'held',
  warmUp = false,
): Mood {
  // A dark or heavy word was seen: nothing playful while the answer is on its way.
  if (taskCall === 'held') return 'serious';
  if (taskCall === 'waiting' || state.phase === 'sending' || state.phase === 'finishing') {
    return 'thinking';
  }
  if (state.phase === 'listening') return 'listening';
  if (state.mode === 'typing') return 'typing';
  // The very first ask is drawn with Scootch listening, ears open for the first words.
  return warmUp ? 'listening' : 'waiting';
}
