import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@phusclass/tokens';

import type { Translate } from '../../../i18n/i18n-provider';
import { CapsuleButton, DOCK_PADDING, GlassDock } from '../../../ui/buttons';
import { CORNER } from '../../../ui/corner-bar';
import { useScreenStyle } from '../../../ui/use-screen-style';

import { PaperCard } from './drawn-parts';
import { ParkComposer, type ParkComposerHandle } from './park-composer';
import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

/** Kept clear above the sheet, under the session's corner controls. */
const ABOVE = spacing.lg;

/** How tall the on-screen keyboard is: 0 while it is down. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export interface NextTimeSheetProps {
  readonly inks: SessionInks;
  readonly t: Translate;
  /** "Save for tomorrow", with the words exactly as they were typed or said. */
  readonly onSave: (line: string) => void;
  /** Skip, or Save with nothing in the field: the task carries on with no line. */
  readonly onSkip: () => void;
}

/**
 * "Next time, start with…": offered once the task is being carried on, and never needed. One
 * field, typed or held to say, which is the park field with its own words; the two actions sit in
 * the dock under it. The sheet is never taller than the room above the keyboard: where the words
 * would push the dock under the keys, as at the largest text sizes, the words scroll instead.
 */
export function NextTimeSheet({ inks, t, onSave, onSkip }: NextTimeSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const { largeText } = useScreenStyle();
  // At the large text sizes each action takes the dock's whole width, so no word is split.
  const half = [styles.half, largeText && styles.whole];
  const room =
    height - insets.top - CORNER.size - ABOVE - (keyboard > 0 ? keyboard : insets.bottom);
  const field = useRef<ParkComposerHandle | null>(null);
  // The sheet answers once: the field hands over what it holds when it goes, and by then a Skip
  // has already been taken.
  const answered = useRef(false);
  const answer = (act: () => void) => {
    if (answered.current) return;
    answered.current = true;
    act();
  };
  return (
    <View style={[styles.sheet, { maxHeight: room }]} testID="session-next-time">
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PaperCard inks={inks} radius={26} style={styles.words}>
          <SessionText face="step" color={inks.ink} accessibilityRole="header">
            {t('session.nextTime.title')}
          </SessionText>
          <SessionText face="caption" color={inks.muted}>
            {t('session.nextTime.sub')}
          </SessionText>
          <SessionText face="note" color={inks.muted}>
            {t('session.nextTime.how')}
          </SessionText>
        </PaperCard>
      </ScrollView>
      <ParkComposer
        inks={inks}
        t={t}
        handle={field}
        onPark={(line) => answer(() => onSave(line))}
        onCancel={() => answer(onSkip)}
        words={{
          explain: null,
          placeholder: t('session.nextTime.placeholder'),
          label: t('session.nextTime.title'),
          hint: t('session.nextTime.field.hint'),
          save: t('session.nextTime.keep'),
          saveHint: t('session.nextTime.keep.hint'),
        }}
      />
      <GlassDock style={styles.dock}>
        <CapsuleButton
          tone="quiet"
          style={half}
          label={t('session.nextTime.skip')}
          hint={t('session.nextTime.skip.hint')}
          testID="session-next-time-skip"
          onPress={() => answer(onSkip)}
        />
        <CapsuleButton
          tone="ink"
          style={half}
          label={t('session.nextTime.save')}
          hint={t('session.nextTime.save.hint')}
          testID="session-next-time-save"
          // The field hands over what it holds; with nothing in it, that is a Skip.
          onPress={() => (field.current ? field.current.close() : answer(onSkip))}
        />
      </GlassDock>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    gap: spacing.sm,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  words: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  dock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DOCK_PADDING,
  },
  whole: { flexBasis: '100%' },
  half: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
