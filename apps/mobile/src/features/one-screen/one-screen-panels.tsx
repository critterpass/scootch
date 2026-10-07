import { StyleSheet, Text, View } from 'react-native';

import { fonts, shadows } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { Chevron } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { glassPressOwner, GlassSurface } from '../../ui/glass-surface';
import { useScreenStyle } from '../../ui/use-screen-style';
import { WorldGlance } from '../world/world-thumbnail';

import { MinutesControl } from './minutes-control';
import { TreatRow } from './treat-row';

/** The session lengths on offer, in minutes. */
export const SESSION_MINUTES = [10, 25, 50] as const;
export type SessionMinutes = number;
/** The lengths offered when the ask is the smallest there is: it leads, and the longest goes. */
export function minuteOptions(smallest: number | null): readonly number[] {
  return smallest === null || smallest >= SESSION_MINUTES[0]
    ? SESSION_MINUTES
    : [smallest, ...SESSION_MINUTES.slice(0, -1)];
}

const ROW_SIZE = 17;
const SMALL_SIZE = 15;

export interface TaskSetChoicesProps {
  readonly treat: string;
  readonly minutes: SessionMinutes;
  readonly onTreat: (treat: string) => void;
  readonly onMinutes: (minutes: SessionMinutes) => void;
  /** The lengths on offer; the usual three when unset. */
  readonly options?: readonly number[];
}

/** The two choices before a start: the treat for afterwards, and how long to go for. */
export function TaskSetChoices({
  treat,
  minutes,
  onTreat,
  onMinutes,
  options = SESSION_MINUTES,
}: TaskSetChoicesProps) {
  return (
    <View style={styles.choices}>
      <TreatRow treat={treat} onTreat={onTreat} />
      <MinutesControl minutes={minutes} options={options} onMinutes={onMinutes} />
    </View>
  );
}

/** The side of the world's thumbnail in the row, as the board draws it. */
const WORLD_THUMBNAIL = 84;

/**
 * The way into the world, on the quiet screen: the world itself, small and alive, and how many
 * things live there now.
 */
export function WorldRow({ onPress }: { readonly onPress: () => void }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <WorldGlance>
      {({ count, thumbnail }) => {
        const living =
          count === null
            ? ''
            : count === 0
              ? t('world.row.empty')
              : t('world.row.count', { count });
        return (
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={
              living ? `${t('oneScreen.world')}, ${living}` : t('oneScreen.world')
            }
            accessibilityHint={t('oneScreen.world.hint')}
            onPress={onPress}
            testID="world-row"
            style={[styles.world, { backgroundColor: palette.surface }]}
          >
            <View style={styles.worldThumbnail} pointerEvents="none">
              {thumbnail(WORLD_THUMBNAIL)}
            </View>
            <View style={styles.worldWords}>
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.worldTitle,
                  {
                    color: palette.ink,
                    fontSize: size(ROW_SIZE),
                    lineHeight: size(ROW_SIZE) * 1.2,
                  },
                ]}
              >
                {t('oneScreen.world')}
              </Text>
              {living ? (
                <Text
                  allowFontScaling={allowFontScaling}
                  testID="world-row-count"
                  style={[
                    styles.worldCount,
                    { color: palette.muted, fontSize: size(14), lineHeight: size(14) * 1.3 },
                  ]}
                >
                  {living}
                </Text>
              ) : null}
            </View>
            <Chevron color={palette.chevron} direction="right" />
          </PressSpring>
        );
      }}
    </WorldGlance>
  );
}

export interface ChipsProps {
  readonly chips: readonly string[];
  readonly disabled: boolean;
  readonly onChip: (text: string) => void;
  /** What a tap does, for a screen reader; sending the chip as the one thing when unset. */
  readonly hint?: string;
  readonly testPrefix?: string;
}

/** The three tiny examples under the warm-up ask. Tapping one sends it as the one thing. */
export function Chips({ chips, disabled, onChip, hint, testPrefix = 'warm-up-chip' }: ChipsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <View style={styles.chips}>
      {chips.map((chip, index) => (
        <PressSpring
          key={chip}
          accessibilityRole="button"
          accessibilityLabel={chip}
          accessibilityHint={hint ?? t('launch.chip.hint')}
          disabled={disabled}
          onPress={() => onChip(chip)}
          feedback="choice"
          hitSlop={4}
          testID={`${testPrefix}-${index}`}
          answeredBy={glassPressOwner(true)}
        >
          <GlassSurface interactive style={styles.chip}>
            <Text
              pointerEvents="none"
              allowFontScaling={allowFontScaling}
              style={[
                styles.chipLabel,
                // A line of 1.3 keeps stacked Vietnamese marks whole; the padding makes up the
                // board's 37 point pill.
                {
                  color: palette.ink,
                  fontSize: size(SMALL_SIZE),
                  lineHeight: size(SMALL_SIZE) * 1.3,
                },
              ]}
            >
              {chip}
            </Text>
          </GlassSurface>
        </PressSpring>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  choices: {
    gap: 10,
  },
  world: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 30,
    paddingLeft: 6,
    paddingRight: 18,
    paddingVertical: 6,
    minHeight: WORLD_THUMBNAIL + 12,
    boxShadow: shadows.card,
  },
  worldThumbnail: {
    width: WORLD_THUMBNAIL,
    height: WORLD_THUMBNAIL,
  },
  worldCount: {
    fontFamily: fonts.body,
  },
  worldWords: {
    flex: 1,
    gap: 2,
  },
  worldTitle: {
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8.75,
    overflow: 'hidden',
  },
  chipLabel: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
});
