import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom' | 'left' | 'right';
const EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export interface SafeFrameProps extends ViewProps {
  /** The edges that keep clear of the notch and the home bar. All four when left out. */
  readonly edges?: readonly Edge[];
  /** The least room kept at the top, for a frame whose top edge is its own (a sheet's). */
  readonly minTop?: number;
}

/**
 * A full-screen frame that keeps clear of the notch and the home bar. The insets are read from the
 * provider, which has them from the first frame, and applied as padding in the same layout pass as
 * everything inside. The native `SafeAreaView` applies them a moment after the first draw, which
 * moves a control after it has been drawn and leaves its hit area where it was.
 */
export function SafeFrame({ style, edges = EDGES, minTop = 0, ...rest }: SafeFrameProps) {
  const insets = useSafeAreaInsets();
  const applied = (edge: Edge) => (edges.includes(edge) ? insets[edge] : 0);
  return (
    <View
      {...rest}
      style={[
        style,
        {
          paddingTop: Math.max(applied('top'), minTop),
          paddingBottom: applied('bottom'),
          paddingLeft: applied('left'),
          paddingRight: applied('right'),
        },
      ]}
    />
  );
}
