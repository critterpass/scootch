import { StyleSheet, View } from 'react-native';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { SessionText } from '../../session/ui/session-text';

export interface PlayRowProps {
  readonly playing: boolean;
  /** A week with no bar yet: the control is drawn and rests. */
  readonly empty: boolean;
  /** The record's name, or the week's number while it has none. */
  readonly name: string;
  /** The band so far, or who is joining just now. */
  readonly band: string;
  readonly onToggle: () => void;
}

/** The play control and the words beside it: 14 apart, the name on one line. */
export function PlayRow({ playing, empty, name, band, onToggle }: PlayRowProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <View style={styles.row}>
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={playing ? t('record.pause') : t('record.play')}
        accessibilityHint={t('record.play.hint')}
        accessibilityState={{ disabled: empty }}
        disabled={empty}
        testID="record-play"
        onPress={onToggle}
        feedback="primary"
        style={[styles.play, { backgroundColor: palette.ink, opacity: empty ? 0.45 : 1 }]}
      >
        {playing ? (
          <View style={styles.pause}>
            <View style={[styles.pauseBar, { backgroundColor: palette.page }]} />
            <View style={[styles.pauseBar, { backgroundColor: palette.page }]} />
          </View>
        ) : (
          <View style={[styles.triangle, { borderLeftColor: palette.page }]} />
        )}
      </PressSpring>
      <View style={styles.meta}>
        <SessionText
          face="action"
          color={palette.ink}
          numberOfLines={1}
          style={styles.name}
          testID="record-name"
        >
          {name}
        </SessionText>
        <SessionText
          face="caption"
          color={palette.muted}
          style={styles.band}
          accessibilityLiveRegion="polite"
          testID="record-band"
        >
          {band}
        </SessionText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  meta: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 18, lineHeight: 18 * 1.2 },
  band: { fontSize: 13, fontWeight: '500' },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 16px -4px rgba(28,26,23,0.35)',
  },
  triangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 15,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pause: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 5, height: 18, borderRadius: 2 },
});
