import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';
import { noTaskLine } from '@scootch/voice';

import { Scootch } from '../../art/Scootch';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { CapsuleButton } from '../../ui/buttons';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { purchaseStateOf } from './entitlement';
import { offerShows } from './offer-rules';
import { PLUS_SHEET } from './routes';
import { PressSpring } from '../../ui/motion/press-spring';

const instant = (value: unknown): number | null => (typeof value === 'number' ? value : null);

export interface OfferCardProps {
  readonly attitude: Attitude;
  /** Scootch's one line, from the line pack. */
  readonly said: string;
  readonly onTell: () => void;
  readonly onDismiss: () => void;
}

/** The offer as it is drawn: one line, "Tell me", and one tap to wave it away. */
export function OfferCard({ attitude, said, onTell, onDismiss }: OfferCardProps) {
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  const character = useCharacterMotion();
  return (
    <View
      testID="first-offer"
      style={[styles.card, largeText ? styles.stacked : null, { backgroundColor: palette.surface }]}
    >
      <Scootch mood="pleased" attitude={attitude} size={56} {...character} />
      <SessionText face="body" color={palette.ink} style={styles.grow} testID="first-offer-line">
        {said}
      </SessionText>
      <CapsuleButton
        label={t('plus.offer.tell')}
        hint={t('plus.offer.tell.hint')}
        onPress={onTell}
        testID="first-offer-tell"
      />
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={t('plus.offer.dismiss')}
        accessibilityHint={t('plus.offer.dismiss.hint')}
        onPress={onDismiss}
        hitSlop={spacing.sm}
        testID="first-offer-dismiss"
        style={styles.dismiss}
      >
        <SessionText face="action" color={palette.muted}>
          ×
        </SessionText>
      </PressSpring>
    </View>
  );
}

/**
 * The first offer, for the world screen to render. Whether it shows is the domain's rule: in the
 * world, after the third catch, never on the visit that follows a finish, and not for a week once
 * dismissed. It is one line and a way in; the sheet opens only if "Tell me" is tapped.
 */
export function FirstOffer() {
  const runtime = usePlusRuntime();
  const { customer } = usePlusState();
  const { language } = useLanguage();
  const router = useRouter();
  const [attitude, setAttitude] = useState<Attitude | null>(null);
  const purchase = purchaseStateOf(customer);

  useEffect(() => {
    let current = true;
    const { memory } = runtime;
    void (async () => {
      const facts = await runtime.offerFacts();
      if (facts === null) return;
      const now = runtime.now();
      const remembered = {
        dismissedAt: instant(await memory.read('offerDismissedAt')),
        worldVisitedAt: instant(await memory.read('worldVisitedAt')),
      };
      await memory.write('worldVisitedAt', now);
      if (current && offerShows(facts, remembered, purchase, now)) setAttitude(facts.attitude);
    })().catch(() => undefined);
    return () => {
      current = false;
    };
    // Decided once for each visit to the world, with what the store had said by then.
  }, [runtime]);

  if (attitude === null || purchase !== 'free') return null;
  return (
    <OfferCard
      attitude={attitude}
      said={noTaskLine(language, attitude, 'plusOffer')}
      onTell={() => router.push(PLUS_SHEET)}
      onDismiss={() => {
        setAttitude(null);
        void runtime.memory.write('offerDismissedAt', runtime.now()).catch(() => undefined);
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg + 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  grow: { flex: 1 },
  dismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
