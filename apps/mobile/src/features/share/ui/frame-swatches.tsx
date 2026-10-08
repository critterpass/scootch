import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildMaterial, FRAME_LOOKS, type ShareFrame } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';

/** The board's frame swatch: a 40 point disc of the frame's own stock. */
const DISC = 40;
const SPACE = { width: DISC, height: DISC };

function Stock({ frame }: { readonly frame: ShareFrame }) {
  const commands = useMemo(
    () => buildMaterial({ x: 0, y: 0, w: DISC, h: DISC }, DISC / 2, FRAME_LOOKS[frame].material),
    [frame],
  );
  return <CommandCanvas commands={commands} space={SPACE} width={DISC} />;
}

export interface FrameSwatchesProps {
  readonly frames: readonly { readonly id: ShareFrame; readonly locked: boolean }[];
  readonly chosen: ShareFrame;
  /** True while the picture in view is its own stock: the frames are drawn faint and take no touch. */
  readonly resting: boolean;
  /**
   * Whether a locked frame answers a tap (by opening the Plus sheet). False where the composer
   * was opened from the reveal, or on a heavy day: a locked frame then takes no touch.
   */
  readonly open: boolean;
  readonly onChoose: (frame: ShareFrame) => void;
}

/**
 * The four frames a story is printed on, each a disc of its own stock with its name. The chosen
 * one is ringed; one that needs Plus says so under its name.
 */
export function FrameSwatches({ frames, chosen, resting, open, onChoose }: FrameSwatchesProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('share.frame')}
      style={[styles.row, resting ? styles.resting : null]}
    >
      {frames.map(({ id, locked }) => {
        const on = id === chosen && !resting;
        const inert = resting || (locked && !open);
        return (
          <PressSpring
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on, disabled: inert }}
            accessibilityLabel={
              locked ? `${t(`share.frame.${id}`)}, ${t('brand.plus')}` : t(`share.frame.${id}`)
            }
            accessibilityHint={locked ? t('keep.plusOnly.hint') : t('share.frame.hint')}
            disabled={inert}
            onPress={() => onChoose(id)}
            feedback="choice"
            testID={`share-frame-${id}`}
            style={styles.item}
          >
            <View
              style={[
                styles.disc,
                {
                  boxShadow: on
                    ? `0 0 0 3px ${palette.page}, 0 0 0 5px ${palette.ink}`
                    : '0 0 0 0.5px rgba(28,26,23,0.18)',
                },
              ]}
            >
              <View style={styles.clip}>
                <Stock frame={id} />
              </View>
            </View>
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.5}
              numberOfLines={1}
              style={[
                styles.name,
                { color: palette.ink, fontSize: size(11.5), fontWeight: on ? '700' : '500' },
              ]}
            >
              {t(`share.frame.${id}`)}
            </Text>
            <Text allowFontScaling={false} style={[styles.tag, { color: palette.tomato }]}>
              {locked ? t('brand.plus').toLocaleUpperCase() : ' '}
            </Text>
          </PressSpring>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  resting: { opacity: 0.35 },
  item: { alignItems: 'center', gap: 6, minWidth: 64 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2 },
  clip: { width: DISC, height: DISC, borderRadius: DISC / 2, overflow: 'hidden' },
  name: { fontFamily: fonts.body },
  tag: { fontFamily: STAMPED, fontWeight: '700', fontSize: 7.5, letterSpacing: 0.9, marginTop: -2 },
});
