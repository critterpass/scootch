import { StyleSheet, View } from 'react-native';

import type { BurstMark } from './burst-shapes';

/** A four-point star: two long diamonds crossed, with a bright middle when it is gold. */
function Star({ mark, lit }: { readonly mark: BurstMark; readonly lit: boolean }) {
  const side = mark.width / Math.SQRT2;
  const diamond = {
    left: (mark.width - side) / 2,
    top: (mark.width - side) / 2,
    width: side,
    height: side,
    borderRadius: side * 0.12,
    backgroundColor: mark.color,
  };
  const core = mark.width * 0.3;
  return (
    <>
      {lit ? (
        <View
          style={[
            styles.part,
            {
              left: (mark.width - core) / 2,
              top: (mark.width - core) / 2,
              width: core,
              height: core,
              borderRadius: core / 2,
              backgroundColor: mark.color,
              boxShadow: `0 0 ${mark.width * 0.55}px ${mark.width * 0.12}px ${mark.color}`,
            },
          ]}
        />
      ) : null}
      <View
        style={[styles.part, diamond, { transform: [{ scaleX: 0.28 }, { rotate: '45deg' }] }]}
      />
      <View
        style={[styles.part, diamond, { transform: [{ scaleY: 0.28 }, { rotate: '45deg' }] }]}
      />
      {lit ? (
        <View
          style={[
            styles.part,
            {
              left: (mark.width - core * 0.6) / 2,
              top: (mark.width - core * 0.6) / 2,
              width: core * 0.6,
              height: core * 0.6,
              borderRadius: core,
              backgroundColor: '#FFFBEA',
            },
          ]}
        />
      ) : null}
    </>
  );
}

/** A strip of paper folded into a zigzag: three short pieces, each at an angle to the last. */
function Zigzag({ mark }: { readonly mark: BurstMark }) {
  const piece = mark.width / 2.6;
  return (
    <>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.part,
            {
              left: index * piece * 0.8,
              top: mark.height / 2 - 1.4,
              width: piece,
              height: 2.8,
              borderRadius: 1.4,
              backgroundColor: mark.color,
              transform: [{ rotate: index % 2 ? '-48deg' : '48deg' }],
            },
          ]}
        />
      ))}
    </>
  );
}

/** A soap bubble's shine: one bright window and a small one opposite. */
function Shine({ mark }: { readonly mark: BurstMark }) {
  const size = mark.width;
  return (
    <>
      <View
        style={[
          styles.part,
          {
            left: size * 0.18,
            top: size * 0.16,
            width: size * 0.3,
            height: size * 0.18,
            borderRadius: size,
            backgroundColor: 'rgba(255,255,255,0.92)',
            transform: [{ rotate: '-38deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.part,
          {
            left: size * 0.66,
            top: size * 0.68,
            width: size * 0.09,
            height: size * 0.09,
            borderRadius: size,
            backgroundColor: 'rgba(255,255,255,0.7)',
          },
        ]}
      />
    </>
  );
}

/** A blot's extra lobes, so no two blots are plain circles. */
function Lobes({ mark }: { readonly mark: BurstMark }) {
  const size = mark.width;
  const side = mark.id % 4;
  const lobe = size * 0.44;
  const spots = [
    [size * 0.7, size * 0.1],
    [size * 0.62, size * 0.6],
    [-size * 0.12, size * 0.52],
    [size * 0.08, -size * 0.14],
  ] as const;
  const [left, top] = spots[side] ?? spots[0];
  const [smallLeft, smallTop] = spots[(side + 2) % 4] ?? spots[0];
  return (
    <>
      <View
        style={[
          styles.part,
          {
            left,
            top,
            width: lobe,
            height: lobe,
            borderRadius: lobe / 2,
            backgroundColor: mark.color,
          },
        ]}
      />
      <View
        style={[
          styles.part,
          {
            left: smallLeft + size * 0.1,
            top: smallTop + size * 0.1,
            width: lobe * 0.5,
            height: lobe * 0.5,
            borderRadius: lobe,
            backgroundColor: mark.color,
          },
        ]}
      />
    </>
  );
}

/** A soap film's colours, brightest at the rim, as a radial gradient centred in the bubble. */
const FILM =
  'radial-gradient(circle at 50% 50%, rgba(190,225,255,0.06) 0%, rgba(190,225,255,0.1) 46%, rgba(255,180,235,0.42) 58%, rgba(255,230,160,0.3) 63%, rgba(150,235,210,0.48) 67%, rgba(170,210,255,0.75) 71%)';

/** What a mark looks like, standing still: the static part, drawn once. */
export function lookOf(mark: BurstMark) {
  const { width, height, color } = mark;
  switch (mark.shape) {
    case 'strip':
    case 'square':
      return { backgroundColor: color, borderRadius: 1.5 };
    case 'dot':
    case 'fleck':
    case 'droplet':
      return {
        backgroundColor: color,
        borderRadius: width / 2,
        ...(mark.shape === 'fleck'
          ? { boxShadow: `0 0 ${width * 1.6}px ${width * 0.3}px rgba(255,200,80,0.85)` }
          : null),
      };
    case 'curl':
      // Half of a paper ring: a strip that has curled.
      return {
        borderRadius: width / 2,
        borderWidth: Math.max(2.4, width * 0.2),
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: color,
      };
    case 'bubble':
      return {
        borderRadius: width / 2,
        borderWidth: 1.2,
        borderColor: color,
        backgroundImage: FILM,
      };
    case 'blot': {
      const corners = [0.5, 0.42, 0.56, 0.38, 0.48];
      const at = (step: number) => (corners[(mark.id + step) % corners.length] ?? 0.5) * width;
      return {
        backgroundColor: color,
        borderTopLeftRadius: at(0),
        borderTopRightRadius: at(1),
        borderBottomRightRadius: at(2),
        borderBottomLeftRadius: at(3),
        height,
      };
    }
    case 'star':
    case 'sparkle':
    case 'zigzag':
      return {};
  }
}

export function Look({ mark }: { readonly mark: BurstMark }) {
  switch (mark.shape) {
    case 'star':
      return <Star mark={mark} lit={false} />;
    case 'sparkle':
      return <Star mark={mark} lit />;
    case 'zigzag':
      return <Zigzag mark={mark} />;
    case 'bubble':
      return <Shine mark={mark} />;
    case 'blot':
      return <Lobes mark={mark} />;
    case 'strip':
    case 'square':
    case 'dot':
    case 'curl':
    case 'fleck':
    case 'droplet':
      return null;
  }
}

export function placed(mark: BurstMark) {
  return {
    width: mark.width,
    height: mark.height,
    marginLeft: -mark.width / 2,
    marginTop: -mark.height / 2,
  };
}

const styles = StyleSheet.create({
  part: {
    position: 'absolute',
  },
});
