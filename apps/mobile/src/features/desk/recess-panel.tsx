import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { useMayMove } from '../../ui/motion/use-feel';
import { GlidingBar } from '../session/session-clock';

import { panelIn, panelOut } from './class-motion';
import { buttonText, ink, shapes, type } from './class-style';
import type { RecessView } from './desk-view';

/**
 * Whether the desk card is coming back from recess: it then swaps in as the board's panels do. On
 * the desk's first showing it is simply there.
 */
let backFromRecess = false;

/** The desk card's entrance: the panel swap after recess, nothing otherwise. Read once, at mount. */
export function takeBackFromRecess(): boolean {
  const back = backFromRecess;
  backFromRecess = false;
  return back;
}

/** The panel swap's two halves, or a 200 ms crossfade where nothing may move. */
export function panelSwap(mayMove: boolean) {
  return mayMove
    ? { entering: panelIn, exiting: panelOut }
    : { entering: FadeIn.duration(200), exiting: FadeOut.duration(200) };
}

/** Recess on the desk sheet: five minutes counting down, offered and never forced. */
export function RecessPanel({
  recess,
  onBackToClass,
}: {
  readonly recess: RecessView;
  readonly onBackToClass: () => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const swap = panelSwap(useMayMove());
  useEffect(
    () => () => {
      backFromRecess = true;
    },
    [],
  );
  return (
    <Animated.View {...swap} style={styles.head} testID="desk-recess">
      <View style={styles.headRow}>
        <Text allowFontScaling={sizing.allowFontScaling} style={[type.label, { color: ink.green }]}>
          {t('recess.title')}
        </Text>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[type.hand, { color: ink.green, fontSize: sizing.size(18) }]}
        >
          {recess.over ? t('recess.over') : t('recess.earned')}
        </Text>
      </View>
      <Text
        allowFontScaling={sizing.allowFontScaling}
        style={[type.title, { fontSize: sizing.size(22), lineHeight: sizing.size(28) }]}
      >
        {t('recess.heading')}
      </Text>
      <View style={styles.timerRow}>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[type.rounded, styles.timer, { color: ink.green, fontSize: sizing.size(64) }]}
        >
          {recess.left}
        </Text>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.of, { fontSize: sizing.size(15) }]}
        >
          {t('recess.of', { minutes: 5 })}
        </Text>
      </View>
      <GlidingBar
        gone={recess.gone}
        color={ink.green}
        track="rgba(47,107,86,0.12)"
        style={styles.track}
      />
      <PressSpring
        testID="recess-back"
        accessibilityRole="button"
        feedback="primary"
        onPress={onBackToClass}
        style={[shapes.button, shapes.ink, styles.backToClass]}
      >
        <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
          {t('recess.back')}
        </Text>
      </PressSpring>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  of: { color: ink.muted },
  timerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 },
  timer: { lineHeight: undefined, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  track: { marginTop: 8 },
  backToClass: { marginTop: 24 },
});
