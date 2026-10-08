import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useLanguage, type Translate } from '../../../i18n/i18n-provider';
import { useForcedVariant } from '../../../screens/registry/support/forced-variant';
import { useCue } from '../../../state/day-store-provider';
import { CONTROL_HEIGHT, DOCK_PADDING, GlassDock } from '../../../ui/buttons';
import { GlassSurface } from '../../../ui/glass-surface';
import { Chevron, KeyboardIcon, SendIcon, WaveIcon } from '../../../ui/icons';
import { PressSpring, touchHaptic } from '../../../ui/motion/press-spring';
import { useFeel } from '../../../ui/motion/use-feel';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { useComposerFeedback } from '../../composer/composer-feedback';
import type { SpeechPort } from '../../composer/speech';
import { useComposer } from '../../composer/use-composer';

import { parkDraft, THOUGHT_MAX } from './park-draft';
import { parkMotion } from './park-motion';
import { parkSpeech } from './park-speech';
import { ParkTalk } from './park-talk';
import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

/** A capture has no microphone to ask: it is the typing field, the same every time. */
const NO_SPEECH: SpeechPort = {
  status: () => Promise.resolve('unavailable'),
  ask: () => Promise.resolve('unavailable'),
  start: () => undefined,
  stop: () => undefined,
  abort: () => undefined,
};

export interface ParkComposerHandle {
  /** Closes the field. Words already typed or heard are parked; with none, nothing is kept. */
  readonly close: () => void;
}

export interface ParkComposerProps {
  readonly inks: SessionInks;
  readonly t: Translate;
  readonly onPark: (text: string) => void;
  readonly onCancel: () => void;
  /** Lets the screen close the field from outside it (a touch above the dock). */
  readonly handle: RefObject<ParkComposerHandle | null>;
}

/**
 * A thought that turned up mid-session, said or typed: the one screen's composer dock, for a few
 * words. Hold the capsule and talk, with the same waveform, sounds and taps, or switch to the
 * keyboard; either way the words become the parked thought through the same action. One line
 * above the dock says what parking does.
 */
export function ParkComposer({ inks, t, onPark, onCancel, handle }: ParkComposerProps) {
  const { language } = useLanguage();
  const { allowFontScaling, size, reducedMotion } = useScreenStyle();
  const captured = useForcedVariant() !== undefined;
  const arriving = parkMotion(reducedMotion || captured);
  const spoken = useRef(language);
  spoken.current = language;
  const speech = useMemo(
    () => (captured ? NO_SPEECH : parkSpeech(() => spoken.current)),
    [captured],
  );
  // True once the field has handed over or been dismissed, so it does so only once.
  const closed = useRef(false);
  const composer = useComposer({
    speech,
    language,
    // Only a spoken thought comes this way: a typed one is parked by its own button.
    onSend: (text) => {
      closed.current = true;
      onPark(text);
      return Promise.resolve();
    },
  });
  const { state, send } = composer;

  // Heard and felt as the one screen's composer is.
  const playCue = useCue();
  const feel = useFeel();
  useComposerFeedback(state, playCue, () => {
    if (feel.haptics) touchHaptic('choice');
  });

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    const draft = parkDraft(state);
    if (draft === '') onCancel();
    else onPark(draft);
  };
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    handle.current = { close: () => latest.current() };
    return () => {
      handle.current = null;
    };
  }, [handle]);
  // Time running out takes the working screen away with the field on it: whatever it holds,
  // typed or heard so far, is parked at that moment. Nothing written or said is lost.
  useEffect(() => () => latest.current(), []);

  const listening = state.phase === 'listening' || state.phase === 'finishing';
  const typing = state.mode === 'typing';
  const canTalk = state.voice === 'ready' || state.voice === 'unasked';
  const hint =
    state.phase === 'listening'
      ? state.armed
        ? null
        : { text: t('composer.slideToCancel'), slide: true }
      : state.notice === 'cancelled'
        ? { text: t('composer.cancelled'), slide: false }
        : state.notice === 'too_short'
          ? { text: t('composer.tooShort'), slide: false }
          : state.notice === 'empty'
            ? { text: t('composer.empty'), slide: false }
            : { text: t('session.park.explain'), slide: false };

  return (
    <View style={styles.wrap}>
      {hint ? (
        <Animated.View entering={arriving.line} style={styles.fit}>
          <GlassSurface style={styles.pill}>
            <View accessibilityLiveRegion="polite" style={styles.pillRow}>
              {hint.slide ? <Chevron color={inks.ink} direction="left" /> : null}
              <SessionText
                face="hint"
                color={inks.ink}
                testID="session-park-hint"
                style={styles.fit}
              >
                {hint.text}
              </SessionText>
            </View>
          </GlassSurface>
        </Animated.View>
      ) : null}
      <Animated.View entering={arriving.dock} style={styles.stretch}>
        <GlassDock style={styles.dock} testID="session-park-composer">
          {(!typing || canTalk) && !listening ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={typing ? t('composer.talkInstead') : t('composer.typeIt')}
              accessibilityHint={
                typing ? t('composer.talkInstead.hint') : t('composer.typeIt.hint')
              }
              onPress={() => send({ type: typing ? 'voice_tapped' : 'keyboard_tapped' })}
              testID="session-park-switch"
              style={[styles.round, { backgroundColor: `${inks.ink}0F` }]}
            >
              {typing ? <WaveIcon color={inks.ink} /> : <KeyboardIcon color={inks.ink} />}
            </Pressable>
          ) : null}
          {typing ? (
            <>
              <TextInput
                autoFocus
                value={state.text}
                onChangeText={(text) => send({ type: 'text_changed', text })}
                onSubmitEditing={() => latest.current()}
                maxLength={THOUGHT_MAX}
                returnKeyType="done"
                submitBehavior="submit"
                placeholder={t('session.park.placeholder')}
                placeholderTextColor={inks.muted}
                accessibilityLabel={t('talk.parkThought')}
                accessibilityHint={t('session.park.hint')}
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={2}
                testID="session-park-input"
                style={[styles.input, { color: inks.ink, fontSize: Math.min(size(17), 34) }]}
              />
              {state.text.trim() === '' ? null : (
                <PressSpring
                  accessibilityRole="button"
                  accessibilityLabel={t('session.park.save')}
                  accessibilityHint={t('session.park.save.hint')}
                  onPress={() => latest.current()}
                  feedback="primary"
                  testID="session-park-save"
                  style={[styles.round, { backgroundColor: inks.button }]}
                >
                  <SendIcon color={inks.onButton} />
                </PressSpring>
              )}
            </>
          ) : (
            <ParkTalk state={state} level={composer.level} inks={inks} t={t} onEvent={send} />
          )}
        </GlassDock>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    borderRadius: 18,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  pillRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  fit: {
    flexShrink: 1,
  },
  stretch: { alignSelf: 'stretch' },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOCK_PADDING,
  },
  round: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: CONTROL_HEIGHT,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.body,
    fontWeight: '500',
  },
});
