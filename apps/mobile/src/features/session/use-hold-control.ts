import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { SessionEvent } from '@scootch/domain';

import {
  holdControl,
  holdReducer,
  type HoldCaption,
  type HoldControl,
  type HoldInput,
} from './hold-control';
import type { FinishControl } from './session-view';

/** How long after the store answers a finish the control looks whether it was taken. */
const SETTLE_AFTER_MS = 100;

export interface HoldControlHandle {
  readonly progress: SharedValue<number>;
  readonly caption: HoldCaption;
  readonly input: (input: HoldInput) => void;
}

/**
 * Runs the hold reducer on the screen: inputs go through it, the events it asks for are sent on,
 * and while the ring is filling or draining it is fed one frame after another.
 */
export function useHoldControl(
  control: FinishControl,
  send: (event: SessionEvent) => void | Promise<void>,
  startAt = 0,
  /** The finish was taken and its catch is playing on this screen: the control stays as it ended. */
  taken = false,
): HoldControlHandle {
  const state = useRef<HoldControl>({ ...holdControl(control), progress: startAt });
  const progress = useSharedValue(startAt);
  const [caption, setCaption] = useState<HoldCaption>(startAt > 0 ? 'nearly' : 'idle');
  const frame = useRef<number | null>(null);
  const last = useRef(0);
  const sender = useRef(send);
  sender.current = send;
  const mounted = useRef(true);
  const wasTaken = useRef(taken);
  wasTaken.current = taken;

  const apply = useCallback(
    (input: HoldInput) => {
      const step = holdReducer(state.current, input);
      state.current = step.control;
      progress.value = step.control.progress;
      setCaption(step.control.caption);
      for (const event of step.send) {
        const sent = sender.current(event);
        if (!step.control.finished) continue;
        // Once the store has answered, a control still on the screen was not taken: it resets.
        // Looked at a moment later, once the screen has caught up with the store.
        void Promise.resolve(sent).then(() =>
          setTimeout(() => {
            if (!mounted.current || wasTaken.current) return;
            const settled = holdReducer(state.current, { type: 'settled' });
            state.current = settled.control;
            progress.value = settled.control.progress;
            setCaption(settled.control.caption);
          }, SETTLE_AFTER_MS),
        );
      }
    },
    [progress],
  );

  const run = useCallback(() => {
    if (frame.current !== null) return;
    last.current = Date.now();
    const tick = () => {
      const now = Date.now();
      // A stalled frame counts for no more than a twentieth of a second, so the ring never jumps.
      apply({ type: 'frame', elapsedMs: Math.min(50, now - last.current) });
      last.current = now;
      const { holding, progress: filled, finished } = state.current;
      frame.current = !finished && (holding || filled > 0) ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
  }, [apply]);

  useEffect(
    () => () => {
      mounted.current = false;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const input = useCallback(
    (next: HoldInput) => {
      apply(next);
      run();
    },
    [apply, run],
  );

  return { progress, caption, input };
}
