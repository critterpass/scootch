import {
  Canvas,
  ColorMatrix,
  Group,
  Paint,
  Path,
  rect,
  rrect,
  Skia,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { VIEW_SIZE } from '@scootch/art';
import type { MonsterRow } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { useAppearance } from '../../../screens/registry/support/forced-variant';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import { LiveMonsterLayer } from '../../reveal/ui/live-monster';

import { SHELF_POCKET } from './pocket';

/** Turns any drawing into its own shape in one flat ink: dark on the light page, light on the dark. */
const SILHOUETTE = {
  light: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  dark: [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
} as const;

export interface WildPocketProps {
  readonly spec: MonsterRow['spec'];
  readonly width: number;
  /** "Still wild". */
  readonly title: string;
  /** "Lurking 12 days". */
  readonly lurking: string;
  readonly label: string;
  readonly hint: string;
  readonly testID: string;
  readonly onPress?: () => void;
}

/**
 * A monster that has not been caught yet, waiting in an empty pocket: its outline alone on a
 * hatched ground, with how long its thing has been lurking. The days are the thing's, never the
 * person's.
 */
export const WildPocket = memo(function WildPocket(props: WildPocketProps) {
  const { spec, width, title, lurking } = props;
  const { palette } = useScreenStyle();
  const appearance = useAppearance();
  const height = SHELF_POCKET.height;
  const hatch = useMemo(() => {
    const path = Skia.Path.Make();
    for (let x = -height; x < width; x += 12) {
      path.moveTo(x, height);
      path.lineTo(x + 6, height);
      path.lineTo(x + 6 + height, 0);
      path.lineTo(x + height, 0);
      path.close();
    }
    return path;
  }, [width, height]);
  const clip = useMemo(
    () => rrect(rect(0, 0, width, height), SHELF_POCKET.corner, SHELF_POCKET.corner),
    [width, height],
  );
  const outline = 80;
  return (
    <PressSpring
      accessibilityRole={props.onPress ? 'button' : 'image'}
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      disabled={!props.onPress}
      onPress={props.onPress}
      testID={props.testID}
      style={[
        styles.wild,
        { width, height, borderRadius: SHELF_POCKET.corner, borderColor: `${palette.ink}2E` },
      ]}
    >
      <Canvas style={[StyleSheet.absoluteFill, { width, height }]}>
        <Group clip={clip}>
          <Path path={hatch} color={`${palette.ink}09`} />
          <Group
            opacity={0.16}
            layer={
              <Paint>
                <ColorMatrix matrix={[...SILHOUETTE[appearance]]} />
              </Paint>
            }
          >
            <Group
              transform={[
                { translateX: (width - outline) / 2 },
                { translateY: height - outline - 38 },
                { scale: outline / VIEW_SIZE },
              ]}
            >
              <LiveMonsterLayer spec={spec} alive={false} />
            </Group>
          </Group>
        </Group>
      </Canvas>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.wildTitle, { color: palette.muted }]}
      >
        {title}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.stat, { color: palette.tomato }]}
      >
        {lurking.toLocaleUpperCase()}
      </Text>
    </PressSpring>
  );
});

const styles = StyleSheet.create({
  wild: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 8,
    gap: 2,
    overflow: 'hidden',
  },
  wildTitle: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 11 },
  stat: {
    marginTop: 3,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 8,
    letterSpacing: 0.48,
  },
});
