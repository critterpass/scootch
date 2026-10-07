import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT } from '../../ui/buttons';
import { CameraIcon } from '../../ui/icons';
import { GlassSurface } from '../../ui/glass-surface';
import { PressSpring } from '../../ui/motion/press-spring';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../ui/use-screen-style';

import { DOCK_HELD_SCALE, DOCK_PADDING } from './composer-fold';
import { ComposerHints, type ComposerHintsProps } from './composer-hints';
import type { ComposerEvent } from './composer-machine';
import type { ComposerGate } from './composer-parts';
import { ComposerRow } from './composer-row';
import { ComposerStacked } from './composer-stacked';
import { SendFly, useSendShot } from './send-fly';
import { useFollow } from './use-follow';

export interface ComposerViewProps extends ComposerHintsProps {
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  readonly onEvent: (event: ComposerEvent) => void;
  /** The day has no start left: the dock takes no words. Unset on an ordinary dock. */
  readonly gate?: ComposerGate;
  /** Opens the camera, on a phone that can read a photo. Unset where there is no camera button. */
  readonly onCamera?: () => void;
}

/**
 * The composer: a glass dock holding the capsule. Held, the capsule takes the dock's whole width,
 * turns tomato and shows the waveform and the time; the round button turns the dock into a text
 * field. What is sent lifts off the dock as a pill and flies to Scootch. The passing hint is not
 * drawn here: the screen draws `ComposerHintLayer` over itself, so the pill is inside its parent. The dock's layout never changes while any of that happens: everything moves by
 * transform and opacity on the UI thread. At the large text sizes the controls stack full width.
 * Where nothing may move, the states crossfade.
 */
export function ComposerView({ level, onEvent, gate, onCamera, ...hints }: ComposerViewProps) {
  const { state, screenReader } = hints;
  const { largeText, reducedMotion, palette } = useScreenStyle();
  const t = useT();
  const listening = state.phase === 'listening' || state.phase === 'finishing';
  const busy = state.phase === 'sending' || state.phase === 'finishing' || hints.thinking;

  const drag = useSharedValue(0);
  // The held dock swells a touch, as a thing does under a thumb.
  const swell = useFollow(listening ? 1 : 0, reducedMotion ? 0 : 500, SPRING_CURVE);
  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (DOCK_HELD_SCALE - 1) * swell.value }],
  }));
  const shot = useSendShot(state, !reducedMotion && !largeText);
  // No camera beside a dock that takes no words; and none to tap while it is being spoken to.
  const camera = gate ? undefined : onCamera;
  const occupied = listening || busy;
  const parts = { state, level, listening, busy, screenReader, drag, gate: gate ?? null, onEvent };

  return (
    <View style={styles.wrap}>
      <ComposerHints {...hints} />
      {screenReader && state.phase === 'listening' ? (
        <CapsuleButton
          tone="quiet"
          label={t('composer.cancelRecording')}
          hint={t('composer.cancelled')}
          onPress={() => onEvent({ type: 'cancel_tapped' })}
          testID="composer-cancel"
          style={styles.full}
        />
      ) : null}
      <View style={[styles.full, camera && !largeText && styles.beside]}>
        <View style={camera && !largeText ? styles.dockSlot : null}>
          <Animated.View style={dockStyle}>
            <GlassSurface style={[styles.dock, largeText && styles.dockStacked]} testID="composer">
              {largeText ? <ComposerStacked {...parts} /> : <ComposerRow {...parts} />}
            </GlassSurface>
          </Animated.View>
          <SendFly shot={shot} />
        </View>
        {camera && largeText ? (
          <CapsuleButton
            tone="quiet"
            label={t('camera.open')}
            hint={t('camera.open.hint')}
            disabled={occupied}
            onPress={camera}
            testID="composer-camera"
            style={styles.stackedCamera}
          />
        ) : camera ? (
          // Beside the dock, not in it: the capsule's sweep across the dock is left as it was.
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('camera.open')}
            accessibilityHint={t('camera.open.hint')}
            accessibilityState={{ disabled: occupied }}
            disabled={occupied}
            onPress={camera}
            testID="composer-camera"
            feedback="choice"
            restOpacity={occupied ? 0.4 : 1}
          >
            <GlassSurface style={styles.camera}>
              <CameraIcon color={palette.ink} />
            </GlassSurface>
          </PressSpring>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
  },
  full: {
    alignSelf: 'stretch',
  },
  beside: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: DOCK_PADDING,
  },
  dockSlot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  camera: {
    width: CONTROL_HEIGHT + DOCK_PADDING * 2,
    height: CONTROL_HEIGHT + DOCK_PADDING * 2,
    borderRadius: (CONTROL_HEIGHT + DOCK_PADDING * 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stackedCamera: {
    marginTop: DOCK_PADDING,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CONTROL_HEIGHT / 2 + DOCK_PADDING,
    padding: DOCK_PADDING,
    overflow: 'hidden',
  },
  dockStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: DOCK_PADDING,
  },
});
