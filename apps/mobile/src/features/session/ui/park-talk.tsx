import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { spacing } from '@scootch/tokens';

import type { Translate } from '../../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../../ui/buttons';
import { WaveIcon } from '../../../ui/icons';
import { CROSSFADE_MS } from '../../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../../ui/use-screen-style';
import {
  CANCEL_SLIDE,
  type ComposerEvent,
  type ComposerState,
} from '../../composer/composer-machine';
import { Waveform } from '../../composer/waveform';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

/** The capsule's colour once the cancel is armed, as the one screen's composer has it. */
const ARMED = '#5A5550';
const SPRING = { damping: 18, stiffness: 220 } as const;

export interface ParkTalkProps {
  readonly state: ComposerState;
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  readonly inks: SessionInks;
  readonly t: Translate;
  readonly onEvent: (event: ComposerEvent) => void;
}

/**
 * Hold to talk, for a parked thought: the one screen's capsule, in the same dock. Held, it turns
 * tomato and shows the live waveform and the time; slid left, it arms the cancel; let go, the
 * words are parked. A screen reader's double tap starts it and the next one parks.
 */
export function ParkTalk({ state, level, inks, t, onEvent }: ParkTalkProps) {
  const { allowFontScaling, size, reducedMotion } = useScreenStyle();
  const startX = useRef(0);
  const listening = state.phase === 'listening' || state.phase === 'finishing';
  const busy = state.phase === 'sending' || state.phase === 'finishing';

  const held = useSharedValue(0);
  useEffect(() => {
    const target = listening ? 1 : 0;
    held.value = reducedMotion
      ? withTiming(target, { duration: CROSSFADE_MS })
      : withSpring(target, SPRING);
  }, [held, listening, reducedMotion]);

  const { armed } = state;
  const fill = useAnimatedStyle(() => ({
    backgroundColor: armed
      ? ARMED
      : interpolateColor(held.value, [0, 1], [inks.button, inks.tomato]),
  }));

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={listening ? t('composer.stopAndSend') : t('talk.hold')}
      accessibilityHint={t('composer.toggle.hint')}
      accessibilityState={{ busy }}
      onAccessibilityTap={() => onEvent({ type: 'toggled', at: Date.now() })}
      onStartShouldSetResponder={() => !busy}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        startX.current = event.nativeEvent.pageX;
        onEvent({ type: 'hold_started', at: Date.now() });
      }}
      onResponderMove={(event) => {
        const dx = event.nativeEvent.pageX - startX.current;
        if (dx < CANCEL_SLIDE !== state.armed) onEvent({ type: 'slid', dx });
      }}
      onResponderRelease={() => onEvent({ type: 'released', at: Date.now() })}
      onResponderTerminate={() => onEvent({ type: 'released', at: Date.now() })}
      testID="session-park-talk"
      style={styles.stage}
    >
      <Animated.View style={[styles.capsule, fill]}>
        {state.phase === 'listening' && armed ? (
          <SessionText face="capsule" color={inks.onButton} style={styles.label}>
            {t('composer.releaseToCancel')}
          </SessionText>
        ) : listening && state.startedAt !== null ? (
          <Waveform
            level={level}
            startedAt={state.startedAt}
            moving={!reducedMotion}
            color={inks.onTomato}
            allowFontScaling={allowFontScaling}
            fontSize={size(15)}
          />
        ) : (
          <>
            <WaveIcon color={inks.onButton} />
            <SessionText face="capsule" color={inks.onButton} style={styles.label}>
              {t('talk.hold')}
            </SessionText>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: CONTROL_HEIGHT,
  },
  capsule: {
    flex: 1,
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  label: {
    textAlign: 'center',
    flexShrink: 1,
  },
});
