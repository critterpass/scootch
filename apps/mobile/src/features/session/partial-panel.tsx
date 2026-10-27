import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { buttonText, ink, shapes, type } from '../desk/class-style';
import { fixedLine } from '../desk/his-line';

import type { SessionViewProps } from './session-view';

/**
 * Not yet: partial credit and its three choices (another period, back on the board with a line
 * for next time, or erase it), and the line for next time when the board is chosen.
 */
export function PartialPanel(props: SessionViewProps & { readonly which: 'choices' | 'note' }) {
  const t = useT();
  const { language } = useLanguage();
  const sizing = useTextSizing();
  const { clock } = props;
  const size = (n: number) => ({ fontSize: sizing.size(n) });
  const choice = (id: string, dot: string, label: string, hint: string, onPress: () => void) => (
    <PressSpring
      testID={id}
      accessibilityRole="button"
      feedback="choice"
      accessibilityHint={hint}
      onPress={onPress}
      style={[shapes.soft, styles.choice]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.choiceWords}>
        <Text allowFontScaling={sizing.allowFontScaling} style={[styles.choiceLabel, size(16)]}>
          {label}
        </Text>
        <Text allowFontScaling={sizing.allowFontScaling} style={[styles.hint, size(13)]}>
          {hint}
        </Text>
      </View>
    </PressSpring>
  );

  const partial = (
    <View style={styles.panel} testID="session-partial">
      <View style={styles.headRow}>
        <Text allowFontScaling={sizing.allowFontScaling} style={[type.label, { color: ink.muted }]}>
          {t('session.partial')}
        </Text>
        <PressSpring
          accessibilityRole="button"
          feedback="choice"
          onPress={props.onClosePartial}
          hitSlop={12}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={[styles.back, size(15)]}>
            {t('session.back')}
          </Text>
        </PressSpring>
      </View>
      <Text
        allowFontScaling={sizing.allowFontScaling}
        numberOfLines={3}
        style={[styles.taskTitle, size(19)]}
      >
        {props.title}
      </Text>
      <View style={styles.choices}>
        {choice(
          'partial-another',
          ink.red,
          fixedLine(language, 'partialAnotherPeriod'),
          t('session.anotherHint', { count: clock?.minutes ?? 10 }),
          props.onAnother,
        )}
        {choice(
          'partial-board',
          '#F2B33D',
          fixedLine(language, 'partialBackOnBoard'),
          t('session.boardHint'),
          props.onBackOnBoard,
        )}
        {choice(
          'partial-erase',
          '#A7A9B4',
          fixedLine(language, 'partialErase'),
          t('session.eraseHint'),
          props.onErase,
        )}
      </View>
    </View>
  );

  const note = (
    <View style={styles.panel} testID="session-note">
      <View style={styles.headRow}>
        <Text allowFontScaling={sizing.allowFontScaling} style={[type.label, { color: ink.muted }]}>
          {t('session.partial')}
        </Text>
        <PressSpring
          accessibilityRole="button"
          feedback="choice"
          onPress={props.onClosePartial}
          hitSlop={12}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={[styles.back, size(15)]}>
            {t('session.back')}
          </Text>
        </PressSpring>
      </View>
      <Text
        allowFontScaling={sizing.allowFontScaling}
        numberOfLines={2}
        style={[styles.taskTitle, size(19)]}
      >
        {props.title}
      </Text>
      <TextInput
        testID="partial-note"
        autoFocus
        value={props.note}
        onChangeText={props.onNote}
        placeholder={t('session.notePlaceholder')}
        placeholderTextColor="rgba(106,69,184,0.45)"
        allowFontScaling={sizing.allowFontScaling}
        returnKeyType="done"
        onSubmitEditing={props.onSaveNote}
        style={[type.hand, styles.noteInput, size(22)]}
      />
      <PressSpring
        testID="partial-save"
        accessibilityRole="button"
        feedback="primary"
        onPress={props.onSaveNote}
        style={[shapes.button, shapes.ink]}
      >
        <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
          {t('session.noteSave')}
        </Text>
      </PressSpring>
    </View>
  );

  return props.which === 'note' ? note : partial;
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  taskTitle: { fontWeight: '600', color: ink.text, letterSpacing: -0.2 },
  muted: { color: ink.muted },
  hint: { color: ink.muted, fontWeight: '500' },
  choices: { gap: 8, marginTop: 4 },
  choice: {
    minHeight: 58,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  choiceWords: { flex: 1 },
  choiceLabel: { color: ink.text, fontWeight: '700' },
  back: { color: ink.muted, fontWeight: '600' },
  noteInput: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF9E3',
    color: ink.purple,
  },
});
