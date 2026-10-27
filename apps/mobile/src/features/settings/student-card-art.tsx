import { Canvas, Circle, Group, Oval, Path, RoundedRect } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';

/** The Settings board's student card drawings. All decoration: VoiceOver hears none of it. */

const RED = '#D42A24';
const STAR =
  'M15 7.5 L17 13 L22.7 13 L18.1 16.4 L19.8 22 L15 18.6 L10.2 22 L11.9 16.4 L7.3 13 L13 13 Z';
const SEAL_STAR =
  'M26 15 L28.6 22.4 L36.5 22.4 L30.2 27.2 L32.5 34.8 L26 30.3 L19.5 34.8 L21.8 27.2 L15.5 22.4 L23.4 22.4 Z';

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** The school's crest at the card's blue top: a red star in a white ring. */
export function Crest() {
  return (
    <Canvas style={styles.crest} {...hidden}>
      <Circle cx={15} cy={15} r={14} color="#FFFFFF" />
      <Circle cx={15} cy={15} r={11} color={RED} style="stroke" strokeWidth={1.5} />
      <Path path={STAR} color={RED} />
    </Canvas>
  );
}

/** The card's chip slot, at the top's right end. */
export function Slot() {
  return <View style={styles.slot} {...hidden} />;
}

/**
 * The photo: a student in a white school shirt on the board's blue, drawn as the board draws
 * it, with the school's red seal pressed over its corner.
 */
export function Photo() {
  return (
    <View style={styles.photoBox} {...hidden}>
      <View style={styles.photo}>
        <Canvas style={styles.photoCanvas}>
          <Path path="M8 116 C10 88 26 78 44 78 C62 78 78 88 80 116 Z" color="#FFFFFF" />
          <Path path="M36 80 L44 94 L52 80 Z" color="#E9F1FA" />
          <RoundedRect x={37} y={62} width={14} height={18} r={5} color="#F4C19B" />
          <Oval x={24} y={24} width={40} height={44} color="#F9C9A4" />
          <Path
            path="M23 44 C22 26 34 20 46 21 C58 22 67 30 65 46 C61 36 54 32 44 32 C36 32 28 36 23 44 Z"
            color="#2E2A33"
          />
          <Oval x={35} y={45.6} width={4} height={4.8} color="#2E2A33" />
          <Oval x={49} y={45.6} width={4} height={4.8} color="#2E2A33" />
          <Path
            path="M40 57 Q44 59.5 48 57"
            color="#B5614A"
            style="stroke"
            strokeWidth={1.8}
            strokeCap="round"
          />
        </Canvas>
      </View>
      <Canvas style={styles.seal}>
        <Group transform={[{ scale: 44 / 52 }]}>
          <Circle cx={26} cy={26} r={23} color={RED} style="stroke" strokeWidth={2.5} />
          <Circle cx={26} cy={26} r={17} color={RED} style="stroke" strokeWidth={1} />
          <Path path={SEAL_STAR} color={RED} />
        </Group>
      </Canvas>
    </View>
  );
}

/** The board's bar widths: every other one is a bar, 1.4 points apart, inside 150 points. */
const BAR_WIDTHS = [
  3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 1, 2, 3, 1,
  1, 2, 1, 3,
];

function barsPath(): string {
  let x = 0;
  let path = '';
  BAR_WIDTHS.forEach((w, i) => {
    if (i % 2 === 0 && x + w <= 150) path += `M${x} 0h${w}v24h-${w}z`;
    x += w + 1.4;
  });
  return path;
}
const BARS = barsPath();

/** The card's barcode and its number: the class, then the school year's two years. */
export function Barcode({ number }: { readonly number: string }) {
  return (
    <View style={styles.barcode} {...hidden}>
      <Canvas style={styles.bars}>
        <Path path={BARS} color="#1C1A18" />
      </Canvas>
      <Text allowFontScaling={false} style={styles.number}>
        {number}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  crest: { width: 30, height: 30 },
  slot: {
    marginLeft: 'auto',
    width: 36,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.28)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
  },
  photoBox: { width: 88, height: 116 },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#7FB2E5',
    boxShadow: 'inset 0 0 0 1px rgba(30,50,90,0.12)',
  },
  photoCanvas: { width: 88, height: 116 },
  seal: { position: 'absolute', right: -10, bottom: -8, width: 44, height: 44, opacity: 0.82 },
  barcode: { paddingTop: 10, gap: 3 },
  bars: { width: 150, height: 24 },
  number: {
    fontFamily: 'ui-monospace',
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#4A443E',
  },
});
