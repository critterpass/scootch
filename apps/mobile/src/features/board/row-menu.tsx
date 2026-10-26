import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@phusclass/tokens';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { RowAction } from './board-row';
import type { BoardRow } from './board-rows';
import { CHALK } from './chalk';

export interface RowMenuProps {
  readonly row: BoardRow;
  /** Opens straight on the words, as a long-press on Reword would. */
  readonly rewording?: boolean;
  readonly onAction: (id: string, action: RowAction) => void;
  readonly onReword: (id: string, text: string) => void;
  readonly onClose: () => void;
}

/**
 * Everything a task on the board can have done to it, on one panel at the foot of the board: the
 * tap and long-press way to what a swipe does, and the only way to reword it.
 */
export function RowMenu({ row, rewording = false, onAction, onReword, onClose }: RowMenuProps) {
  const t = useT();
  const { mayMove } = useFeel();
  const { size, allowFontScaling } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(rewording);
  const [words, setWords] = useState(row.text);

  const choices: { readonly action: RowAction; readonly label: string }[] = [
    ...(row.onDesk ? [] : [{ action: 'desk' as const, label: t('board.menu.desk') }]),
    { action: 'reword', label: t('board.menu.reword') },
    { action: 'tick', label: t('board.menu.tick') },
    { action: 'erase', label: t('board.menu.erase') },
  ];
  const save = () => {
    onReword(row.id, words);
    onClose();
  };

  return (
    <View style={StyleSheet.absoluteFill} testID="board-menu">
      <Animated.View
        {...(mayMove ? { entering: FadeIn.duration(200) } : {})}
        {...(mayMove ? { exiting: FadeOut.duration(160) } : {})}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t('board.menu.close')}
          onPress={onClose}
        />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={styles.foot} pointerEvents="box-none">
        <Animated.View
          {...(mayMove ? { entering: SlideInDown.duration(320) } : {})}
          {...(mayMove ? { exiting: SlideOutDown.duration(220) } : {})}
          accessibilityViewIsModal
          style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          {editing ? (
            <>
              <TextInput
                testID="board-reword-field"
                accessibilityLabel={t('board.reword.field')}
                value={words}
                onChangeText={setWords}
                autoFocus
                multiline
                submitBehavior="submit"
                returnKeyType="done"
                onSubmitEditing={save}
                allowFontScaling={allowFontScaling}
                selectionColor={CHALK.date}
                style={[styles.field, { fontSize: size(24) }]}
              />
              <View style={styles.buttons}>
                <MenuButton
                  id="board-menu-close"
                  label={t('board.menu.close')}
                  onPress={onClose}
                  quiet
                />
                <MenuButton id="board-reword-save" label={t('board.reword.save')} onPress={save} />
              </View>
            </>
          ) : (
            <>
              <Text
                accessibilityRole="header"
                allowFontScaling={allowFontScaling}
                style={[styles.task, { fontSize: size(24), lineHeight: size(24) * 1.3 }]}
              >
                {row.text}
              </Text>
              <View style={styles.list}>
                {choices.map(({ action, label }) => (
                  <MenuButton
                    key={action}
                    id={`board-menu-${action}`}
                    label={label}
                    onPress={() => {
                      if (action === 'reword') {
                        setEditing(true);
                        return;
                      }
                      onClose();
                      onAction(row.id, action);
                    }}
                  />
                ))}
                <MenuButton
                  id="board-menu-close"
                  label={t('board.menu.close')}
                  onPress={onClose}
                  quiet
                />
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** One choice on the panel. */
function MenuButton({
  id,
  label,
  onPress,
  quiet = false,
}: {
  readonly id: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly quiet?: boolean;
}) {
  const { size, allowFontScaling } = useScreenStyle();
  return (
    <Pressable
      testID={id}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        quiet ? styles.quiet : styles.solid,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text allowFontScaling={allowFontScaling} style={[styles.buttonText, { fontSize: size(17) }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: CHALK.scrim,
  },
  foot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: CHALK.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 16,
    gap: 14,
  },
  task: {
    fontFamily: HAND_FAMILY,
    color: CHALK.chalk,
    paddingHorizontal: 8,
  },
  list: {
    gap: 8,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    flexGrow: 1,
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: CHALK.pill,
  },
  quiet: {
    borderWidth: 1.5,
    borderColor: CHALK.pillLine,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: CHALK.white,
    fontWeight: '700',
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  field: {
    fontFamily: HAND_FAMILY,
    color: CHALK.chalk,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});
