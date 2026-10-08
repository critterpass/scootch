import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import type { MonsterRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { lineWithNoTask } from '../../state/lines';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import type { Offerings } from '../plus/purchases-port';

import {
  itemOf,
  itemsOf,
  STUDIO_KINDS,
  studioProductIds,
  type StudioItem,
  type StudioKind,
} from './catalogue';
import { partOf, withPart, type Look } from './look';
import { actionFor, afterPick, afterTakeOff, canTakeOff, mayWear, owns } from './rules';
import { StudioScreen, type StudioModel } from './studio-screen';
import type { SwatchNote } from './ui/swatch-strip';

/** How long what is said after a purchase stays up. */
const TOAST_MS = 2800;

const kindFrom = (value: unknown): StudioKind =>
  STUDIO_KINDS.includes(value as StudioKind) ? (value as StudioKind) : 'finish';

/**
 * The studio on the real phone. It opens on the finishes (or the tab it was asked for), wearing
 * what the person wears. Picking something that may be worn puts it on at once; anything else is
 * only tried on until it is bought. A purchase goes through the same port as Plus, and what was
 * bought is put on.
 */
export function StudioContainer() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { port, store } = usePlusRuntime();
  const { customer, unlocked, look, member } = usePlusState();
  const { settings } = useToday();
  const { keepsakes } = useKeepsakes();
  const [tab, setTab] = useState<StudioKind>(() => kindFrom(params.tab));
  const [trying, setTrying] = useState<Look>(look);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [notice, setNotice] = useState<StudioModel['notice']>(
    port.available ? null : 'unavailable',
  );

  useEffect(() => {
    let current = true;
    void port
      .offerings(studioProductIds)
      .then((loaded) => {
        if (current) setOfferings(loaded);
      })
      .catch(() => {
        if (current) setNotice('unavailable');
      });
    return () => {
      current = false;
    };
  }, [port]);
  useEffect(() => {
    if (toast === null) return undefined;
    const gone = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(gone);
  }, [toast]);

  const facts = useMemo(
    () => ({ ownedItems: customer.ownedItems, capabilities: unlocked.capabilities }),
    [customer.ownedItems, unlocked.capabilities],
  );
  const focus = itemOf(tab, partOf(trying, tab));
  const priceOf = (item: StudioItem): string | null =>
    item.productId ? (offerings?.items[item.productId]?.priceText ?? null) : null;
  const notes = useMemo(() => {
    const under: Record<string, SwatchNote> = {};
    for (const item of itemsOf(tab)) {
      const price = item.productId ? (offerings?.items[item.productId]?.priceText ?? null) : null;
      under[item.id] = owns(item, facts.ownedItems)
        ? { text: t('studio.owned'), priced: false }
        : mayWear(item, facts)
          ? { text: t('studio.withPlus'), priced: false }
          : { text: price, priced: true };
    }
    return under;
  }, [tab, offerings, facts, t]);
  // The newest monster, whether or not it has been caught yet: the trail is shown on it.
  const monster = useMemo(() => {
    const newest = (keepsakes?.monsters ?? []).reduce<MonsterRow | null>(
      (latest, one) => (latest === null || one.hatchedAt > latest.hatchedAt ? one : latest),
      null,
    );
    return newest ? { spec: newest.spec, name: newest.name } : null;
  }, [keepsakes]);
  const homeLine = useMemo(() => lineWithNoTask('waiting', settings), [settings]);

  const looks = { worn: look, trying };
  return (
    <StudioScreen
      model={{
        tab,
        trying,
        focus,
        action: actionFor(focus, look, facts),
        price: priceOf(focus),
        held: owns(focus, facts.ownedItems) ? 'owned' : mayWear(focus, facts) ? 'plus' : null,
        notes,
        canTakeOff: canTakeOff(looks, tab),
        number: member.number,
        homeLine,
        monster,
        busy,
        notice,
        toast,
      }}
      actions={{
        close: () => (router.canGoBack() ? router.back() : router.replace('/')),
        showTab: setTab,
        tryOn: (item) => {
          // The rule decides what a pick puts on, whatever the screen drew.
          const after = afterPick(looks, item, facts);
          setTrying(after.trying);
          if (partOf(after.worn, item.kind) !== partOf(look, item.kind))
            void store.wear(after.worn);
          setNotice(port.available ? null : 'unavailable');
        },
        wear: () => {
          if (mayWear(focus, facts)) void store.wear(afterPick(looks, focus, facts).worn);
        },
        takeOff: () => {
          const after = afterTakeOff(looks, tab);
          setTrying(after.trying);
          if (partOf(after.worn, tab) !== partOf(look, tab)) void store.wear(after.worn);
        },
        buy: () => {
          if (focus.productId === null || busy) return;
          const bought = focus;
          setBusy(true);
          setNotice(null);
          void port
            .purchase(focus.productId)
            .then(async (outcome) => {
              if (outcome.kind === 'purchased') {
                await store.accept(outcome.customer);
                // Bought is owned, so it goes on: over what is worn now, not over a stale look.
                const worn = store.getState().look;
                await store.wear(withPart(worn, bought.kind, bought.id));
                setToast(t(`studio.bought.${bought.kind}`, { name: t(bought.name) }));
              } else if (outcome.kind === 'failed') setNotice('failed');
            })
            .catch(() => setNotice('failed'))
            .finally(() => setBusy(false));
        },
      }}
    />
  );
}
