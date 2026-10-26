import { StyleSheet, Text, View } from 'react-native';

import type { CommentStep } from '@phusclass/domain/board';
import { fonts } from '@phusclass/tokens';
import { linePacks } from '@phusclass/voice/class';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import type { PaperInks } from '../board/chalk';

import type { LogbookRow } from './logbook-rows';
import { Signature } from './signature';

const MARGIN = 56;

/** His comment, in his words for the rung. The circled 10 has none: it is drawn. */
function commentWords(step: CommentStep, language: 'en' | 'vi'): string | null {
  const pack = linePacks[language];
  if (step === 'fine') return pack.commentFine[0];
  if (step === 'good') return pack.commentGood[0];
  if (step === 'good work') return pack.commentGoodWork[0];
  return null;
}

/** One finished task: the day in the margin, the period, his comment in red and his signature. */
export function LogbookLine({
  row,
  index,
  ink,
}: {
  readonly row: LogbookRow;
  readonly index: number;
  readonly ink: PaperInks;
}) {
  const t = useT();
  const { language } = useLanguage();
  const { size, allowFontScaling, largeText } = useScreenStyle();
  const words = row.comment === null ? null : commentWords(row.comment, language);
  const signed = row.comment === null ? [] : [words ?? t('logbook.ten'), t('logbook.signed')];
  return (
    <View
      testID={`logbook-row-${index}`}
      accessible
      accessibilityLabel={[row.day, row.text, row.detail, ...signed]
        .filter((part) => part !== null)
        .join('. ')}
      style={[styles.row, largeText ? styles.rowLarge : null]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.day,
          largeText ? styles.dayLarge : null,
          { color: ink.red, fontSize: size(15) },
        ]}
      >
        {row.day ?? ''}
      </Text>
      <View style={[styles.what, largeText ? styles.whatLarge : null]}>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.task, { color: ink.ink, fontSize: size(16) }]}
        >
          {row.text}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.detail, { color: ink.muted, fontSize: size(12.5) }]}
        >
          {row.detail}
        </Text>
      </View>
      {row.comment === null ? null : (
        <View style={[styles.signed, largeText ? styles.signedLarge : null]}>
          {words === null ? (
            <View style={[styles.ten, { borderColor: ink.red }]}>
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.tenText, { color: ink.red, fontSize: size(15) }]}
              >
                10
              </Text>
            </View>
          ) : (
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.comment, { color: ink.red, fontSize: size(15) }]}
            >
              {words}
            </Text>
          )}
          <Signature color={ink.red} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingRight: 14,
  },
  rowLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingLeft: MARGIN + 16,
    paddingVertical: 8,
  },
  day: {
    width: MARGIN,
    textAlign: 'center',
    fontFamily: HAND_FAMILY,
  },
  dayLarge: {
    width: 'auto',
    textAlign: 'left',
  },
  what: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 16,
    gap: 2,
  },
  whatLarge: {
    flex: 0,
    paddingLeft: 0,
    alignSelf: 'stretch',
  },
  task: {
    fontFamily: fonts.body,
    fontWeight: '700',
  },
  detail: {
    fontFamily: fonts.body,
  },
  signed: {
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 8,
  },
  signedLarge: {
    marginLeft: 0,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  comment: {
    fontFamily: HAND_FAMILY,
  },
  ten: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 6,
    transform: [{ rotate: '-10deg' }],
  },
  tenText: {
    fontFamily: HAND_FAMILY,
  },
});
