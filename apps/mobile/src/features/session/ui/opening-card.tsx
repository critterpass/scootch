import { StyleSheet, View } from 'react-native';

import type { SessionOpening } from '@scootch/domain';

import type { Translate } from '../../../i18n/i18n-provider';

import { PaperCard } from './drawn-parts';
import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

export interface OpeningCardProps {
  readonly opening: SessionOpening;
  readonly inks: SessionInks;
  readonly t: Translate;
}

/**
 * What a sitting opens on when the user left a line for it: their own words, exactly as they
 * were given, under the sheet's own title. "You, yesterday" is printed only when the rules say
 * the line is from the day before; any other day it has no label. A serious task shows the same
 * words plain, with no card around them.
 */
export function OpeningCard({ opening, inks, t }: OpeningCardProps) {
  const words = (
    <>
      <SessionText face="note" color={inks.muted}>
        {t('session.nextTime.title')}
      </SessionText>
      <SessionText face="step" color={inks.ink} testID="session-opening-line">
        {opening.text}
      </SessionText>
      {opening.label === 'yesterday' ? (
        <SessionText face="note" color={inks.muted} testID="session-opening-label">
          {t('session.opening.yesterday')}
        </SessionText>
      ) : null}
    </>
  );
  return opening.plain ? (
    <View testID="session-opening" style={styles.card}>
      {words}
    </View>
  ) : (
    <PaperCard inks={inks} radius={26} testID="session-opening" style={styles.card}>
      {words}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  // The board's card: 16 points in from the sides of the screen, 20 of its own inside.
  card: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
});
