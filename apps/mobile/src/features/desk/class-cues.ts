import { useCallback } from 'react';

import { CUES } from '@phusclass/sound';

import { nativeCuePlayer, nativeHaptics } from '../../effects/native-adapters';
import { useBoardStore } from '../../state/board-provider';
import { useFeel } from '../../ui/motion/use-feel';

/** The classroom's sounds: the drum, chalk, the bell, his tea and his red pen. */
export type ClassCue = 'drum' | 'chalk' | 'bell' | 'tea-sip' | 'red-pen';

// One player for the classroom. Short effects follow the ringer switch: the app's audio session
// never plays them through a silenced phone (`effects/sound-mode-control.ts`).
let player: ReturnType<typeof nativeCuePlayer> | null = null;

function cues() {
  player ??= nativeCuePlayer();
  return player;
}

/**
 * Plays a classroom cue with its haptic taps in step. Taps follow the Haptics switch and are
 * never felt under a capture. Reduce Motion takes away motion, not touch: every tap is still felt.
 * The drum's sound follows its switch in settings; its taps are still felt.
 */
export function useClassCue(): (cue: ClassCue) => void {
  const { haptics } = useFeel();
  const store = useBoardStore();
  return useCallback(
    (cue: ClassCue) => {
      if (cue !== 'drum' || store.getSnapshot().drum) cues().play(cue);
      const taps = CUES[cue]?.haptics ?? [];
      if (haptics && taps.length > 0) nativeHaptics.play(taps, cue);
    },
    [haptics, store],
  );
}
