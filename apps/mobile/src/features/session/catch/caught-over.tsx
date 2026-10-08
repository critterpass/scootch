import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { ScreenProps } from '../screens/screen-props';
import { BurstMarks } from '../ui/burst-marks';

/** How long the catch has played before a tap anywhere may pass it. */
const PASS_AFTER_MS = 400;

export interface CaughtOverProps extends ScreenProps {
  /**
   * Where the burst goes up from, on the screen: `undefined` while that is still being found,
   * `null` when it cannot be.
   */
  readonly burstFrom: { readonly x: number; readonly y: number } | null | undefined;
}

/**
 * Over the screen once the monster is caught: the burst, and a tap anywhere to pass the catch,
 * but not the tail of the gesture or the hold that made it.
 */
export function CaughtOver({ model, actions, inks, t, burstFrom }: CaughtOverProps) {
  const [mayPass, setMayPass] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMayPass(true), PASS_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <>
      {burstFrom === undefined ? null : (
        <BurstMarks
          kind="catch"
          inks={inks}
          reducedMotion={model.reducedMotion}
          controlAt={burstFrom}
        />
      )}
      {mayPass ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('session.skip')}
          accessibilityHint={t('session.skip.hint')}
          testID="session-caught-pass"
          onPress={actions.passCaught}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </>
  );
}
