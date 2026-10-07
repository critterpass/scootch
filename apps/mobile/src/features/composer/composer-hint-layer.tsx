import { StyleSheet, View } from 'react-native';

import { ComposerHintPill } from './composer-hint-pill';
import type { ComposerHintsProps } from './composer-hints';

/** The pill floats this far above the composer. */
export const HINT_ABOVE = 10;

export interface ComposerHintLayerProps extends ComposerHintsProps {
  /** From the bottom of the layer up to the top of the composer, as the screen measured it. */
  readonly composerTop: number;
}

/**
 * Where the hint pill lives: a layer over the whole screen under the corners, which takes no touch
 * itself, with the pill centred 10 points above the composer. The pill is inside the layer's own
 * bounds, so a touch on its "Cancel" is delivered: a view outside its parent's bounds gets none.
 * The screen that holds the composer draws this layer as its last child and says where the
 * composer's top is.
 */
export function ComposerHintLayer({ composerTop, ...hints }: ComposerHintLayerProps) {
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View pointerEvents="box-none" style={[styles.place, { bottom: composerTop + HINT_ABOVE }]}>
        <ComposerHintPill {...hints} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  place: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
  },
});
