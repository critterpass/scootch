import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useTextSizing } from '../../../screens/registry/support/forced-variant';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';

export interface Segment<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly testID: string;
}

export interface SegmentedProps<Value extends string> {
  readonly segments: readonly Segment<Value>[];
  readonly chosen: Value;
  readonly onChoose: (value: Value) => void;
  /** Read out for the whole control. */
  readonly label: string;
}

/**
 * The board's segmented control: a 36 point track with a 2 point inset, and the chosen segment
 * raised on a white pill with a soft shadow. The words are 14 points, semibold when chosen.
 */
export function Segmented<Value extends string>(props: SegmentedProps<Value>) {
  const { segments, chosen, onChoose, label } = props;
  const { palette } = useScreenStyle();
  const { allowFontScaling, size } = useTextSizing();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.track}>
      {segments.map((segment) => {
        const on = segment.value === chosen;
        return (
          <PressSpring
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={segment.label}
            onPress={() => onChoose(segment.value)}
            feedback="choice"
            hitSlop={{ top: 6, bottom: 6 }}
            testID={segment.testID}
            style={[styles.segment, on ? [styles.on, { backgroundColor: palette.surface }] : null]}
          >
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.4}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.word,
                { color: palette.ink, fontSize: size(14), fontWeight: on ? '600' : '500' },
              ]}
            >
              {segment.label}
            </Text>
          </PressSpring>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(118,112,104,0.13)',
    padding: 2,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  on: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
  word: { fontFamily: fonts.body },
});
