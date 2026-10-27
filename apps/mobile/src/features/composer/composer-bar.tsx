import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { GlassSurface } from '../../ui/glass-surface';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ClassIcon } from '../desk/class-icons';
import { BUTTON_MAX_SCALE, cappedSize, ink, type } from '../desk/class-style';

import type { ComposerNote, ComposerState } from './composer-machine';
import { ListeningDot, VoiceBars as Bars } from './voice-bars';

const IDLE_HEIGHT = 56;
const LISTEN_HEIGHT = 160;
const LINE = 21;
/** A finger that drifts while holding still holds. */
const HOLD_RETENTION = { top: 600, bottom: 300, left: 300, right: 300 };

export interface ComposerBarProps {
  readonly state: ComposerState;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
  readonly onType: () => void;
  readonly onEdit: (draft: string) => void;
  readonly onSubmit: () => void;
  /** Typing closes, back to holding to talk. */
  readonly onCancel: () => void;
  /** The field's words when typing opens with none of its own (a capture). */
  readonly placeholder?: string;
  readonly testID?: string;
}

const NOTE_KEYS: Record<
  Exclude<ComposerNote, 'short tap'>,
  'composer.micOff' | 'composer.noHearing' | 'composer.kept'
> = {
  'mic off': 'composer.micOff',
  'no hearing': 'composer.noHearing',
  kept: 'composer.kept',
};

/**
 * "Say it" on the desk: hold to tell him, or the keyboard to type. While a finger holds it, the
 * bar grows upward and shows the words as they are heard; let go, and the words stay on show
 * while they go to the board. Typing grows the field a line at a time, up to four.
 */
export function ComposerBar({
  state,
  onPressIn,
  onPressOut,
  onType,
  onEdit,
  onSubmit,
  onCancel,
  testID = 'composer',
}: ComposerBarProps) {
  const t = useT();
  const sizing = useTextSizing();
  const { largeText } = useScreenStyle();
  const [typedLines, setTypedLines] = useState(1);

  const listening =
    state.mode === 'listening' || state.mode === 'stopping' || state.mode === 'asking';
  const showing = state.mode === 'handing';
  const typing = state.mode === 'typing';
  const words =
    state.mode === 'listening' || state.mode === 'stopping'
      ? state.words.trim()
      : showing
        ? state.text
        : '';
  const all = words === '' ? [] : words.split(/\s+/);
  const last = all[all.length - 1] ?? '';
  const before = all.slice(0, -1).join(' ');
  const height =
    listening || showing
      ? LISTEN_HEIGHT
      : typing
        ? IDLE_HEIGHT + (typedLines - 1) * LINE
        : IDLE_HEIGHT;
  const note =
    (state.mode === 'typing' || state.mode === 'idle') &&
    state.note !== null &&
    state.note !== 'short tap'
      ? t(NOTE_KEYS[state.note])
      : null;

  return (
    <View testID={testID}>
      <GlassSurface
        style={[
          styles.glass,
          { height: sizing.allowFontScaling ? undefined : height, minHeight: height },
        ]}
      >
        {typing ? (
          <View style={styles.typingRow}>
            <Pressable
              testID="composer-close"
              accessibilityRole="button"
              accessibilityLabel={t('composer.hold')}
              onPress={onCancel}
              style={styles.smallMic}
            >
              <ClassIcon name="mic" color={ink.text} />
            </Pressable>
            <TextInput
              testID="composer-input"
              autoFocus
              multiline
              value={state.draft}
              onChangeText={onEdit}
              onContentSizeChange={(event) =>
                setTypedLines(
                  Math.max(1, Math.min(4, Math.round(event.nativeEvent.contentSize.height / LINE))),
                )
              }
              placeholder={t('composer.placeholder')}
              placeholderTextColor={ink.muted}
              accessibilityLabel={t('composer.inWriting')}
              allowFontScaling={sizing.allowFontScaling}
              submitBehavior="submit"
              returnKeyType="send"
              onSubmitEditing={onSubmit}
              style={[styles.input, { fontSize: sizing.size(16) }]}
            />
            <Pressable
              testID="composer-send"
              accessibilityRole="button"
              accessibilityLabel={t('composer.handIn')}
              onPress={onSubmit}
              style={[
                styles.send,
                { backgroundColor: state.draft.trim() ? ink.red : 'rgba(28,26,24,0.2)' },
              ]}
            >
              <ClassIcon name="up" color={ink.white} size={16} weight={2.6} />
            </Pressable>
          </View>
        ) : (
          <View>
            <Pressable
              testID="composer-hold"
              accessibilityRole="button"
              accessibilityLabel={listening || showing ? t('composer.letGo') : t('composer.hold')}
              accessibilityHint={listening || showing ? undefined : t('composer.letGo')}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              pressRetentionOffset={HOLD_RETENTION}
              style={listening || showing ? styles.listening : styles.idleRow}
            >
              {listening || showing ? (
                <>
                  <View style={styles.listenHead}>
                    <ListeningDot />
                    <Text
                      allowFontScaling={sizing.allowFontScaling}
                      style={[type.label, { color: ink.red }]}
                    >
                      {showing ? t('desk.thinking') : t('composer.listening')}
                    </Text>
                  </View>
                  <View style={styles.wordsBox}>
                    <Text
                      testID="composer-words"
                      allowFontScaling={sizing.allowFontScaling}
                      numberOfLines={4}
                      style={[type.rounded, styles.words, { fontSize: sizing.size(18) }]}
                    >
                      {before === '' ? '' : `${before} `}
                      <Text key={all.length}>{last}</Text>
                    </Text>
                  </View>
                  <View style={styles.listenFoot}>
                    {showing ? <View /> : <Bars />}
                    <Text
                      allowFontScaling={sizing.allowFontScaling}
                      style={[styles.hint, { fontSize: sizing.size(12) }]}
                    >
                      {showing ? '' : t('composer.letGo')}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.hold}>
                  <ClassIcon name="mic" color={ink.text} />
                  <Text
                    allowFontScaling={sizing.allowFontScaling}
                    maxFontSizeMultiplier={BUTTON_MAX_SCALE}
                    // At the largest sizes the words wrap rather than being cut.
                    numberOfLines={largeText ? 2 : 1}
                    style={[styles.holdText, { fontSize: cappedSize(sizing, 16) }]}
                  >
                    {t('composer.hold')}
                  </Text>
                </View>
              )}
            </Pressable>
            {listening || showing ? null : (
              <Pressable
                testID="composer-type"
                accessibilityRole="button"
                accessibilityLabel={t('composer.typeInstead')}
                onPress={onType}
                style={styles.keyboard}
              >
                <ClassIcon name="keyboard" color={ink.text} size={20} />
              </Pressable>
            )}
          </View>
        )}
      </GlassSurface>
      {note !== null ? (
        <Animated.Text
          entering={FadeIn.duration(200)}
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.note, { fontSize: sizing.size(13) }]}
        >
          {note}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: { borderRadius: 28, overflow: 'hidden', justifyContent: 'center' },
  idleRow: { padding: 5, paddingRight: 61, minHeight: IDLE_HEIGHT, justifyContent: 'center' },
  hold: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  holdText: { color: ink.text, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  keyboard: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ink.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listening: { flex: 1, minHeight: LISTEN_HEIGHT, padding: 14, gap: 8 },
  listenHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordsBox: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  words: { color: ink.text, lineHeight: 23 },
  listenFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hint: { color: ink.muted },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 5, gap: 4 },
  smallMic: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ink.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 46 + 3 * LINE,
    paddingHorizontal: 10,
    paddingTop: 12.5,
    paddingBottom: 12.5,
    lineHeight: LINE,
    color: ink.text,
  },
  send: {
    width: 36,
    height: 36,
    margin: 5,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: 8, marginHorizontal: 8, color: ink.muted, lineHeight: 18 },
});
