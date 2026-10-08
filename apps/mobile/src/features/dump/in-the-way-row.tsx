import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { InTheWay } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { HelperChip } from '../one-screen/helper-chip';

const ANSWERS: readonly InTheWay[] = ['boring', 'scary', 'confusing', 'too_big'];
const ASK_SIZE = 15;

export interface InTheWayRowProps {
  readonly answer: InTheWay | null;
  /** An answer, `null` when it is taken back or skipped. */
  readonly onAnswer: (answer: InTheWay | null) => void;
}

/**
 * "Anything in the way?": one optional row under the battery. A tap picks an answer and a second
 * tap takes it back; Skip takes the row away, the same as never having been asked.
 */
export function InTheWayRow({ answer, onAnswer }: InTheWayRowProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const [skipped, setSkipped] = useState(false);
  if (skipped) return null;
  const ask = { color: palette.muted, fontSize: size(ASK_SIZE), lineHeight: size(ASK_SIZE) * 1.3 };
  return (
    <View style={styles.row} testID="in-the-way">
      <View style={styles.head}>
        <Text allowFontScaling={allowFontScaling} style={[styles.ask, ask]}>
          {t('inTheWay.ask')}
        </Text>
        <HelperChip
          label={t('inTheWay.skip')}
          hint={t('inTheWay.skip.hint')}
          set={false}
          onPress={() => {
            setSkipped(true);
            onAnswer(null);
          }}
          testID="in-the-way-skip"
        />
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('inTheWay.ask')}
        style={styles.answers}
      >
        {ANSWERS.map((one) => (
          <HelperChip
            key={one}
            role="radio"
            label={t(`inTheWay.${one}`)}
            hint={t('inTheWay.hint')}
            set
            chosen={answer === one}
            onPress={() => onAnswer(answer === one ? null : one)}
            testID={`in-the-way-${one}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  ask: { flex: 1, fontFamily: fonts.body },
  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
