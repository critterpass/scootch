import { useContext, useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Translate } from '../../../i18n/i18n-provider';
import { useLanguage } from '../../../i18n/i18n-provider';
import { useDayStore } from '../../../state/day-store-provider';
import { othersHuntingShown } from '../../../state/others-hunting';
import { keepOthersHunting } from '../../../state/others-hunting-host';
import { useTogether } from '../../../state/together-context';
import type { SessionInks } from '../ui/session-inks';
import { SessionText } from '../ui/session-text';

import { OthersHuntingFixed } from './others-hunting-fixed';

/**
 * Makes sure the phone is telling the server about its sessions. The session's screen asks for it
 * whenever it is drawn, so a session is counted from its first moment on screen to its end.
 */
export function useOthersHuntingWatch(): void {
  const store = useDayStore();
  const { table } = useTogether();
  useEffect(() => keepOthersHunting(store, table), [store, table]);
}

function useOthersHunting(): number | null {
  const fixed = useContext(OthersHuntingFixed);
  const read = useSyncExternalStore(
    (listener) => othersHuntingShown.subscribe(listener),
    () => othersHuntingShown.get(),
  );
  return fixed === undefined ? read : fixed;
}

/**
 * "214 are hunting something right now", small and quiet over the pill. Absent rather than a
 * small number, offline, on a serious task, at a table, and when switched off: the phone's count
 * already says which.
 */
export function OthersHuntingLine({
  inks,
  t,
}: {
  readonly inks: SessionInks;
  readonly t: Translate;
}) {
  const count = useOthersHunting();
  const { language } = useLanguage();
  if (count === null) return null;
  return (
    <View style={styles.row} testID="session-others-hunting">
      <View
        style={[styles.dot, { backgroundColor: inks.tomato }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <SessionText face="caption" color={inks.muted} style={styles.words}>
        {t('session.othersHunting', { number: count.toLocaleString(language) })}
      </SessionText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, opacity: 0.35 },
  words: { flexShrink: 1, textAlign: 'center' },
});
