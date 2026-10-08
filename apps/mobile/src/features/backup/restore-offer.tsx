import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDataTools, useDispatch } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';
import { ScootchSays } from '../../ui/scootch-says';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ChoiceDock } from '../dump/dump-panels';

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
  /** On a phone already in use, declining keeps what is here: it is not a fresh start. */
  readonly inUse?: boolean;
}

/** A new phone that already holds the backup token: one line, and the choice. */
export function RestoreOfferView({
  line,
  attitude,
  busy,
  onRestore,
  onFresh,
  inUse = false,
}: RestoreOfferViewProps) {
  const { palette } = useScreenStyle();
  const t = useT();
  return (
    // The frame the first-launch steps share: the words in the page's gutter, scrolling at large
    // text, and the choices in the dock at the foot. The padding is on the views inside, since the
    // safe frame sets its own.
    <SafeFrame style={[styles.screen, { backgroundColor: palette.page }]} testID="restore-offer">
      <ScrollView contentContainerStyle={styles.said}>
        <ScootchSays mood="pleased" attitude={attitude} line={line} />
      </ScrollView>
      <View style={styles.footer}>
        <ChoiceDock
          quiet={{
            label: t(inUse ? 'backup.restore.keep' : 'backup.restore.no'),
            hint: t(inUse ? 'backup.restore.keep.hint' : 'backup.restore.no.hint'),
            disabled: busy,
            onPress: onFresh,
            testID: 'restore-no',
          }}
          action={{
            label: t('backup.restore.yes'),
            hint: t('backup.restore.yes.hint'),
            disabled: busy,
            onPress: onRestore,
            testID: 'restore-yes',
          }}
        />
      </View>
    </SafeFrame>
  );
}

/**
 * Stands in front of first launch. A phone with no backup token goes straight through, without a
 * request. One that holds a token and has a snapshot waiting is offered its world back first.
 *
 * With `late`, it stands over a phone that is already in use and could not be asked at first
 * launch (no connection then): what is under it shows at once, and the offer covers it only when
 * the server turns out to hold more than the phone does.
 */
export function RestoreGate({
  children,
  late = false,
}: {
  readonly children: ReactNode;
  readonly late?: boolean;
}) {
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
    const timer = late ? undefined : setTimeout(() => settle(null), LOOK_FOR_MS);
    void backup
      .findRestore()
      .catch(() => null)
      .then(settle);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [backup]);

  if (!late && found === undefined)
    return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (!late && found === null) return children;
  const restore = async () => {
    if (!found) return;
    setBusy(true);
    const outcome = await backup.restore(found).catch(() => 'refused' as const);
    if (outcome === 'restored') await dispatch({ type: 'storage_replaced' }).catch(() => undefined);
    setFound(null);
  };
  const fresh = async () => {
    setBusy(true);
    await backup.declineRestore().catch(() => undefined);
    setBusy(false);
    setFound(null);
  };
  const offer = (
    <RestoreOfferView
      line={lineWithNoTask('restoreOffer', { language, attitude: 'cheeky' })}
      attitude="cheeky"
      busy={busy}
      onRestore={() => void restore()}
      onFresh={() => void fresh()}
      inUse={late}
    />
  );
  if (!late) return offer;
  // The same tree with and without the offer, so what is under it is never mounted afresh and
  // nothing typed there is lost when the offer arrives or leaves.
  return (
    <>
      {children}
      {found ? <View style={StyleSheet.absoluteFill}>{offer}</View> : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  said: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
