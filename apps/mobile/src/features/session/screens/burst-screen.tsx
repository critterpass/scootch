import { Pressable, StyleSheet } from 'react-native';

import { BurstMarks } from '../ui/burst-marks';
import { Characters } from '../ui/characters';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

/**
 * The moment the session begins: Scootch celebrating, the start line, and the burst over both.
 * It goes quiet by itself; a tap anywhere gets there sooner.
 */
export function BurstScreen({ model, actions, inks, t }: ScreenProps) {
  return (
    <SessionFrame
      inks={inks}
      testID="session-start-burst"
      over={<BurstMarks kind="start" inks={inks} reducedMotion={model.reducedMotion} />}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={model.line?.text ?? t('session.skip')}
        accessibilityHint={t('session.skip.hint')}
        testID="session-burst-pass"
        onPress={actions.passBurst}
        style={styles.all}
      >
        <Characters
          mood="celebrating"
          attitude={model.attitude}
          monster={model.monster}
          reducedMotion={model.reducedMotion}
        />
        {model.line ? (
          <SessionText face="headline" color={inks.ink} style={styles.line}>
            {model.line.text}
          </SessionText>
        ) : null}
      </Pressable>
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  all: {
    alignSelf: 'stretch',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  line: {
    alignSelf: 'stretch',
  },
});
