import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { TableIcon } from '../../ui/icons';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { segmentOffset } from '../one-screen/one-screen-frame';

const HEIGHT = 36;
const PADDING = 2;
const LABEL_SIZE = 14;
const SLIDE_MS = 320;
/** The track, as the board fills it, and the chosen pill in each scheme. */
const TRACK = { light: 'rgba(118, 112, 104, 0.13)', dark: 'rgba(118, 112, 104, 0.26)' } as const;
const PILL = { light: '#FFFFFF', dark: '#5E5852' } as const;

/** Who the one thing is done beside. */
export type Company = 'alone' | 'table';
const OPTIONS = ['alone', 'table'] as const satisfies readonly Company[];

export interface CompanyControlProps {
  readonly company: Company;
  readonly onCompany: (company: Company) => void;
}

/**
 * "Alone | At a table": the board's two-part control under the length, with the chosen side on a
 * white pill that slides across. The pill moves by transform on the UI thread. At the large text
 * sizes the two stack, each its own row.
 */
export function CompanyControl({ company, onCompany }: CompanyControlProps) {
  const { palette, allowFontScaling, size, largeText, reducedMotion } = useScreenStyle();
  const appearance = useAppearance();
  const t = useT();
  const chosenIndex = OPTIONS.indexOf(company);

  const [width, setWidth] = useState(0);
  const place = useSharedValue(chosenIndex);
  useEffect(() => {
    place.value = reducedMotion
      ? chosenIndex
      : withTiming(chosenIndex, {
          duration: SLIDE_MS,
          easing: SPRING_CURVE,
          reduceMotion: ReduceMotion.Never,
        });
  }, [chosenIndex, place, reducedMotion]);
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: segmentOffset(place.value, width, OPTIONS.length, PADDING) }],
  }));
  const pillWidth = width > 0 ? (width - PADDING * 2) / OPTIONS.length : 0;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('table.company')}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, largeText && styles.stacked, { backgroundColor: TRACK[appearance] }]}
    >
      {largeText || pillWidth === 0 ? null : (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: pillWidth, backgroundColor: PILL[appearance] }, pill]}
        />
      )}
      {OPTIONS.map((option) => {
        const chosen = option === company;
        return (
          <PressSpring
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen, checked: chosen }}
            accessibilityLabel={t(`table.company.${option}`)}
            accessibilityHint={t(`table.company.${option}.hint`)}
            onPress={() => onCompany(option)}
            feedback="choice"
            hitSlop={{ top: 6, bottom: 6 }}
            testID={`task-set-company-${option}`}
            style={[
              styles.segment,
              largeText && styles.segmentStacked,
              largeText && chosen && { backgroundColor: PILL[appearance] },
            ]}
          >
            {option === 'table' ? <TableIcon color={palette.ink} /> : null}
            <Text
              allowFontScaling={allowFontScaling}
              style={[
                styles.label,
                { color: palette.ink, fontSize: size(LABEL_SIZE) },
                chosen && styles.chosen,
              ]}
            >
              {t(`table.company.${option}`)}
            </Text>
          </PressSpring>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    padding: PADDING,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: HEIGHT / 2 - PADDING,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04)',
  },
  segment: {
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: 'row',
    gap: 7,
    minHeight: HEIGHT - PADDING * 2,
    borderRadius: HEIGHT / 2 - PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentStacked: {
    flexGrow: 0,
    flexBasis: 'auto',
    minHeight: 44,
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  chosen: {
    fontWeight: '600',
  },
});
