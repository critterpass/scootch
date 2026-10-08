import { StyleSheet, View } from 'react-native';

import type { Translate } from '../../../i18n/i18n-provider';
import { ParkPill } from '../ui/park-pill';
import type { SessionInks } from '../ui/session-inks';

import { CatchCaption } from './catch-caption';

export interface CatchWordsBlockProps {
  /** Where the block is pinned: under the top row, or above the foot. */
  readonly place: { readonly top: number } | { readonly bottom: number };
  readonly headline: string | null;
  readonly sub: string | null;
  readonly inks: SessionInks;
  readonly t: Translate;
  /** "Park a thought" under the two lines; `null` when it has no place just now. */
  readonly park: { readonly onPress: () => void; readonly back: boolean } | null;
  /**
   * How tall the block turned out, pill and all. The drawing keeps clear of this much: a
   * headline that runs to two lines never lies over the catch.
   */
  readonly onTall: (height: number) => void;
}

/**
 * The words of a catch: the headline, the line under it, and "Park a thought" while there is
 * quiet work to interrupt. They take no touch, so the drawing under them still does; the pill
 * takes its own.
 */
export function CatchWordsBlock(props: CatchWordsBlockProps) {
  const { place, headline, sub, inks, t, park, onTall } = props;
  return (
    <View
      pointerEvents="box-none"
      onLayout={({ nativeEvent }) => onTall(nativeEvent.layout.height)}
      style={[styles.words, place]}
    >
      <View pointerEvents="none" style={styles.lines}>
        <CatchCaption headline={headline} sub={sub} inks={inks} />
      </View>
      {park ? <ParkPill inks={inks} t={t} onPress={park.onPress} back={park.back} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  words: { position: 'absolute', left: 28, right: 28, alignItems: 'center', gap: 10 },
  lines: { alignSelf: 'stretch', alignItems: 'center', gap: 5 },
});
