import type { ScootchProps } from '../../art/Scootch';
import type { ComposerState } from '../composer/composer-machine';

type Mood = ScootchProps['mood'];

/** How Scootch reacts to the composer: he listens, watches the typing, or thinks it over. */
export function composerMood(state: ComposerState, taskCall: 'idle' | 'waiting' | 'held'): Mood {
  // A dark or heavy word was seen: nothing playful while the answer is on its way.
  if (taskCall === 'held') return 'serious';
  if (taskCall === 'waiting' || state.phase === 'sending' || state.phase === 'finishing') {
    return 'thinking';
  }
  if (state.phase === 'listening') return 'listening';
  return state.mode === 'typing' ? 'typing' : 'waiting';
}
