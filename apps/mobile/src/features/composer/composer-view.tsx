import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { KeyboardIcon, WaveIcon } from '../../ui/icons';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../ui/use-screen-style';

import { ComposerCapsule } from './composer-capsule';
import { ComposerField, ComposerSend } from './composer-field';
import { DOCK_HELD_SCALE, DOCK_PADDING } from './composer-fold';
import { ComposerHints, type ComposerHintsProps } from './composer-hints';
import { useFollow } from './use-follow';
import { CANCEL_SLIDE, type ComposerEvent } from './composer-machine';
import { recordingTime, Waveform } from './waveform';

const LABEL_SIZE = 17;
/** The capsule's colour once the cancel is armed. */
const ARMED = '#5A5550';

export interface ComposerViewProps extends ComposerHintsProps {
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  readonly onEvent: (event: ComposerEvent) => void;
}

/**
 * The composer: a glass dock holding the capsule. Held, the capsule takes the dock's whole width,
 * turns tomato and shows the waveform and the time; the keyboard button turns it into a text
 * field. The dock's layout never changes while it is held: the capsule's edge moves by transform.
 * At the large text sizes the controls stack full width. Where nothing may move, the states
 * crossfade.
 */
export function ComposerView({ level, onEvent, ...hints }: ComposerViewProps) {
  const { state, screenReader } = hints;
  const { palette, allowFontScaling, size, largeText, reducedMotion } = useScreenStyle();
  const t = useT();
  const startX = useRef(0);
  const listening = state.phase === 'listening' || state.phase === 'finishing';
  const busy = state.phase === 'sending' || state.phase === 'finishing' || hints.thinking;
  const canTalk = state.voice === 'ready' || state.voice === 'unasked';

  const { armed } = state;
  const slot = CONTROL_HEIGHT + DOCK_PADDING;
  const held = listening ? 1 : 0;
  const drag = useSharedValue(0);
  // The round button stays laid out where it is and only fades as the capsule sweeps over it.
  const leftFade = useFollow(held, reducedMotion ? CROSSFADE_MS : 300);
  const leftStyle = useAnimatedStyle(() => ({ opacity: 1 - leftFade.value }));
  // The held dock swells a touch, as a thing does under a thumb.
  const swell = useFollow(held, reducedMotion ? 0 : 500, SPRING_CURVE);
  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (DOCK_HELD_SCALE - 1) * swell.value }],
  }));

  const labelStyle = [styles.label, { color: palette.page, fontSize: size(LABEL_SIZE) }] as const;

  // In the row, the capsule is drawn over the whole dock and moves by transform alone. Stacked for
  // large text it is already as wide as the dock, and only its colour and its words change.
  const capsule = largeText ? (
    <View
      style={[
        styles.capsule,
        { backgroundColor: !listening ? palette.ink : armed ? ARMED : palette.tomato },
      ]}
    >
      {listening && armed ? (
        <Text allowFontScaling={allowFontScaling} style={[labelStyle, styles.onArmed]}>
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
    </View>
  ) : (
    <ComposerCapsule
      listening={listening}
      armed={armed}
      startedAt={state.startedAt}
      level={level}
      slot={slot}
      drag={drag}
    />
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
        drag.value = 0;
        onEvent({ type: 'hold_started', at: Date.now() });
      }}
      onResponderMove={(event) => {
        const dx = event.nativeEvent.pageX - startX.current;
        drag.value = dx;
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
      <Animated.View style={[styles.full, dockStyle]}>
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
                    {typing ? (
                      <WaveIcon color={palette.ink} />
                    ) : (
                      <KeyboardIcon color={palette.ink} />
                    )}
                  </Pressable>
                </Animated.View>
              ) : null}
              {typing ? field : talk}
              {typing ? sendButton : null}
            </>
          )}
        </GlassSurface>
      </Animated.View>
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
    marginRight: DOCK_PADDING,
  },
  onArmed: {
    color: '#FFFFFF',
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
