import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GUESS_MINUTES, type GuessMinutes } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { Sheet, SheetScroll } from '../../ui/sheet/sheet';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Words } from '../table/words';

import { guessLabel, USUAL_GUESS } from './task-set-helpers';

const STEP_SIZE = 19;
const STEP_HEIGHT = 46;

export interface GuessSheetProps {
  readonly open: boolean;
  /** The guess already made, which the sheet opens on; `null` opens it on the usual one. */
  readonly minutes: GuessMinutes | null;
  readonly onGuess: (minutes: GuessMinutes) => void;
  /** Skip, the shade, a drag down: the sheet goes and nothing is kept. */
  readonly onClose: () => void;
}

/**
 * "How long would this take?": five steps, one of them picked, and a button that says the guess
 * back. Nothing here judges the number, and Skip is the same as never having been asked.
 */
export function GuessSheet({ open, minutes, onGuess, onClose }: GuessSheetProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const [picked, setPicked] = useState<GuessMinutes>(minutes ?? USUAL_GUESS);
  // Opened again, the sheet starts from what is kept, not from a pick that was skipped.
  useEffect(() => {
    if (open) setPicked(minutes ?? USUAL_GUESS);
  }, [open, minutes]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      testID="guess-sheet"
      header={
        <View style={styles.head}>
          <Words kind="title">{t('guess.title')}</Words>
          <Words kind="quiet">{t('guess.sub')}</Words>
        </View>
      }
    >
      <SheetScroll contentContainerStyle={styles.content}>
        <View accessibilityRole="radiogroup" style={styles.steps}>
          {GUESS_MINUTES.map((step) => {
            const chosen = step === picked;
            return (
              <PressSpring
                key={step}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen, checked: chosen }}
                accessibilityLabel={t(guessLabel(step))}
                accessibilityHint={t('guess.choose.hint')}
                onPress={() => setPicked(step)}
                feedback="choice"
                testID={`guess-step-${step}`}
                style={[
                  styles.step,
                  { minHeight: size(STEP_HEIGHT) },
                  chosen && { backgroundColor: `${palette.ink}14` },
                ]}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[
                    chosen ? styles.chosen : styles.label,
                    {
                      color: chosen ? palette.ink : palette.muted,
                      fontSize: size(STEP_SIZE),
                      lineHeight: size(STEP_SIZE) * 1.3,
                    },
                  ]}
                >
                  {t(guessLabel(step))}
                </Text>
              </PressSpring>
            );
          })}
        </View>
        <View style={styles.actions}>
          <CapsuleButton
            label={t('guess.confirm', { length: t(guessLabel(picked)) })}
            hint={t('guess.confirm.hint')}
            onPress={() => {
              onGuess(picked);
              onClose();
            }}
            testID="guess-confirm"
          />
          <CapsuleButton
            tone="quiet"
            label={t('guess.skip')}
            hint={t('guess.skip.hint')}
            onPress={onClose}
            testID="guess-skip"
          />
        </View>
      </SheetScroll>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6, paddingHorizontal: 6 },
  content: { gap: 18, paddingBottom: 6 },
  steps: { gap: 4 },
  step: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.body, fontWeight: '500', textAlign: 'center' },
  chosen: { fontFamily: fonts.body, fontWeight: '700', textAlign: 'center' },
  actions: { gap: 8 },
});
