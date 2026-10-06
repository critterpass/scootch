import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { KeyboardIcon, WaveIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

import { ComposerField, ComposerSend } from './composer-field';
import { ComposerHints, type ComposerHintsProps } from './composer-hints';
import { CANCEL_SLIDE, type ComposerEvent } from './composer-machine';
import { recordingTime, Waveform } from './waveform';

const LABEL_SIZE = 17;
const DOCK_PADDING = 7;
/** The capsule's colour once the cancel is armed. */
const ARMED = '#5A5550';
const SPRING = { damping: 18, stiffness: 220 } as const;
const CROSSFADE_MS = 200;

export interface ComposerViewProps extends ComposerHintsProps {
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  readonly onEvent: (event: ComposerEvent) => void;
}

/**
 * The composer: a glass dock holding the capsule. Held, the capsule turns tomato and shows the
 * waveform and the time; the keyboard button turns it into a text field. At the large text sizes
 * the dock's controls stack full width. Under Reduce Motion nothing morphs: the states crossfade.
 */
export function ComposerView({ level, onEvent, ...hints }: ComposerViewProps) {
  const { state, screenReader } = hints;
  const { palette, allowFontScaling, size, largeText, reducedMotion } = useScreenStyle();
  const t = useT();
  const startX = useRef(0);
  const listening = state.phase === 'listening' || state.phase === 'finishing';
  const busy = state.phase === 'sending' || state.phase === 'finishing' || hints.thinking;
  const canTalk = state.voice === 'ready' || state.voice === 'unasked';

  const held = useSharedValue(0);
  useEffect(() => {
    const target = listening ? 1 : 0;
    held.value = reducedMotion
      ? withTiming(target, { duration: CROSSFADE_MS })
      : withSpring(target, SPRING);
  }, [held, listening, reducedMotion]);

  const { armed } = state;
  const capsuleStyle = useAnimatedStyle(() => ({
    backgroundColor: armed
      ? ARMED
      : interpolateColor(held.value, [0, 1], [palette.ink, palette.tomato]),
  }));
  // The left button folds away as the capsule takes the whole dock. With motion reduced it only
  // fades, and its width changes at once.
  const leftStyle = useAnimatedStyle(() => {
    const folded = reducedMotion ? (listening ? 1 : 0) : held.value;
    return {
      width: interpolate(folded, [0, 1], [CONTROL_HEIGHT, 0]),
      marginRight: interpolate(folded, [0, 1], [DOCK_PADDING, 0]),
      opacity: 1 - held.value,
    };
  });

  const labelStyle = [styles.label, { color: palette.page, fontSize: size(LABEL_SIZE) }] as const;

  const capsule = (
    <Animated.View style={[styles.capsule, capsuleStyle]}>
      {state.phase === 'listening' && state.armed ? (
        <Text allowFontScaling={allowFontScaling} style={labelStyle}>
          {t('composer.releaseToCancel')}
        </Text>
      ) : listening && state.startedAt !== null ? (
        <Waveform
          level={level}
          startedAt={state.startedAt}
          moving={!reducedMotion}
          color={palette.onTomato}
          allowFontScaling={allowFontScaling}
          fontSize={size(15)}
        />
      ) : (
        <>
          <WaveIcon color={palette.page} />
          <Text allowFontScaling={allowFontScaling} style={labelStyle}>
            {t('talk.hold')}
          </Text>
        </>
      )}
    </Animated.View>
  );

  const talk = screenReader ? (
    // Holding is not asked of a screen reader: one double tap starts, the next one sends.
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? t('composer.stopAndSend') : t('talk.hold')}
      accessibilityValue={
        listening && state.startedAt !== null
          ? { text: t('composer.recording', { time: recordingTime(Date.now() - state.startedAt) }) }
          : {}
      }
      accessibilityHint={t('composer.toggle.hint')}
      accessibilityState={{ busy, disabled: busy && !listening }}
      disabled={busy && !listening}
      onPress={() => onEvent({ type: 'toggled', at: Date.now() })}
      testID="composer-talk"
      style={styles.stage}
    >
      {capsule}
    </Pressable>
  ) : (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={t('talk.hold')}
      accessibilityHint={t('composer.hold.hint')}
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
      testID="composer-talk"
      style={styles.stage}
    >
      {capsule}
    </View>
  );

  const field = <ComposerField text={state.text} busy={busy} onEvent={onEvent} />;
  const sendButton = <ComposerSend text={state.text} busy={busy} onEvent={onEvent} />;

  const typing = state.mode === 'typing';
  const switchLabel = typing ? t('composer.talkInstead') : t('composer.typeIt');
  const switchHint = typing ? t('composer.talkInstead.hint') : t('composer.typeIt.hint');
  const onSwitch = () => onEvent({ type: typing ? 'voice_tapped' : 'keyboard_tapped' });
  const showSwitch = !typing || canTalk;

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
      <GlassSurface style={[styles.dock, largeText && styles.dockStacked]} testID="composer">
        {largeText ? (
          <>
            {typing ? field : talk}
            {typing ? sendButton : null}
            {showSwitch && !listening ? (
              <CapsuleButton
                tone="quiet"
                label={switchLabel}
                hint={switchHint}
                onPress={onSwitch}
                testID="composer-switch"
              />
            ) : null}
          </>
        ) : (
          <>
            {showSwitch ? (
              <Animated.View style={[styles.left, leftStyle]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={switchLabel}
                  accessibilityHint={switchHint}
                  disabled={listening || busy}
                  onPress={onSwitch}
                  testID="composer-switch"
                  style={[styles.round, { backgroundColor: `${palette.ink}0F` }]}
                >
                  {typing ? <WaveIcon color={palette.ink} /> : <KeyboardIcon color={palette.ink} />}
                </Pressable>
              </Animated.View>
            ) : null}
            {typing ? field : talk}
            {typing ? sendButton : null}
          </>
        )}
      </GlassSurface>
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
  dock: {
    alignSelf: 'stretch',
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
  left: {
    overflow: 'hidden',
  },
  round: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
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
    fontFamily: fonts.heading,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
