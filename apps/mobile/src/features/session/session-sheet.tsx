import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FoldLayout } from '../../ui/fold/fold-layout';
import { foldSheetStyle } from '../../ui/fold/fold-sheet';
import { useGlide } from '../../ui/fold/use-glide';
import { useMayMove } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { shapes } from '../desk/class-style';
import { panelSwap } from '../desk/recess-panel';
import { BUBBLE_ROOM } from '../desk/speech-bubble';

/**
 * The period's sheet: its panels swap as the board's do, the old one sinking away as the new one
 * rises after it. At the largest text sizes it stops below his bubble and scrolls, as the desk's
 * sheet and the late slip do.
 */
export function SessionSheet({
  panel,
  children,
  fold,
}: {
  /** Which panel is up: a new one swaps in. */
  readonly panel: string;
  readonly children: ReactNode;
  /** On iPhone Duo the sheet is the pose's card, gliding to its place when the phone folds. */
  readonly fold?: FoldLayout;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { largeText } = useScreenStyle();
  const swap = panelSwap(useMayMove());
  const duo = fold !== undefined && fold.sheet !== null;
  const glide = useGlide(fold?.sheet?.left ?? 0, -(fold?.sheet?.bottom ?? 0));
  const body = (
    <Animated.View key={panel} {...swap}>
      {children}
    </Animated.View>
  );
  return (
    <Animated.View
      style={[
        styles.sheet,
        shapes.sheet,
        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        largeText ? { maxHeight: height - insets.top - BUBBLE_ROOM } : null,
        duo && fold ? foldSheetStyle(fold) : null,
        glide,
      ]}
    >
      {duo ? <View style={styles.duoTop} /> : <View style={[shapes.grabber, styles.grabber]} />}
      {largeText ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
  grabber: { marginTop: 10, marginBottom: 14 },
  duoTop: { height: 18 },
  scroll: { flexGrow: 0, flexShrink: 1 },
});
