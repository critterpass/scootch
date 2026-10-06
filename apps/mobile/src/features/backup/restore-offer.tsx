import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Attitude } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDataTools, useDispatch } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';
import { CapsuleButton } from '../../ui/buttons';
import { ScootchSays } from '../../ui/scootch-says';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { Snapshot } from './snapshot';

/** How long a new phone waits to hear whether there is a world to bring back. */
const LOOK_FOR_MS = 4000;

export interface RestoreOfferViewProps {
  /** Scootch's one line, from the offline pack. */
  readonly line: string;
  readonly attitude: Attitude;
  readonly busy: boolean;
  readonly onRestore: () => void;
  readonly onFresh: () => void;
}

/** A new phone that already holds the backup token: one line, and the choice. */
export function RestoreOfferView({
  line,
  attitude,
  busy,
  onRestore,
  onFresh,
}: RestoreOfferViewProps) {
  const { palette } = useScreenStyle();
  const t = useT();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]} testID="restore-offer">
      <View style={styles.said}>
        <ScootchSays mood="pleased" attitude={attitude} line={line} />
      </View>
      <View style={styles.choices}>
        <CapsuleButton
          label={t('backup.restore.yes')}
          hint={t('backup.restore.yes.hint')}
          disabled={busy}
          onPress={onRestore}
          testID="restore-yes"
        />
        <CapsuleButton
          tone="quiet"
          label={t('backup.restore.no')}
          hint={t('backup.restore.no.hint')}
          disabled={busy}
          onPress={onFresh}
          testID="restore-no"
        />
      </View>
    </SafeAreaView>
  );
}

/**
 * Stands in front of first launch. A phone with no backup token goes straight through, without a
 * request. One that holds a token and has a snapshot waiting is offered its world back first.
 */
export function RestoreGate({ children }: { readonly children: ReactNode }) {
  const { backup } = useDataTools();
  const dispatch = useDispatch();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const [found, setFound] = useState<Snapshot | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    const settle = (snapshot: Snapshot | null) => {
      if (current) setFound((before) => (before === undefined ? snapshot : before));
    };
    const timer = setTimeout(() => settle(null), LOOK_FOR_MS);
    void backup
      .findRestore()
      .catch(() => null)
      .then(settle);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [backup]);

  if (found === undefined) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (found === null) return children;
  const restore = async () => {
    setBusy(true);
    const outcome = await backup.restore(found).catch(() => 'refused' as const);
    if (outcome === 'restored') await dispatch({ type: 'storage_replaced' }).catch(() => undefined);
    setFound(null);
  };
  return (
    <RestoreOfferView
      line={lineWithNoTask('restoreOffer', { language, attitude: 'cheeky' })}
      attitude="cheeky"
      busy={busy}
      onRestore={() => void restore()}
      onFresh={() => setFound(null)}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  said: { flex: 1, justifyContent: 'center' },
  choices: { gap: spacing.sm },
});
