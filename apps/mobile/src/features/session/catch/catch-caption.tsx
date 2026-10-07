import { StyleSheet } from 'react-native';

import type { SessionInks } from '../ui/session-inks';
import { SessionText } from '../ui/session-text';

/**
 * The two lines of a catch: the headline and the quiet line under it. A long task shrinks a little
 * and then ends in an ellipsis, so the words never reach the drawing.
 */
export function CatchCaption({
  headline,
  sub,
  inks,
}: {
  readonly headline: string | null;
  readonly sub: string | null;
  readonly inks: SessionInks;
}) {
  return (
    <>
      {headline ? (
        <SessionText
          face="step"
          color={inks.ink}
          accessibilityLiveRegion="polite"
          testID="session-catch-headline"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.centred}
        >
          {headline}
        </SessionText>
      ) : null}
      {sub ? (
        <SessionText
          face="caption"
          color={inks.muted}
          testID="session-catch-line"
          numberOfLines={3}
          style={styles.centred}
        >
          {sub}
        </SessionText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centred: { textAlign: 'center' },
});
