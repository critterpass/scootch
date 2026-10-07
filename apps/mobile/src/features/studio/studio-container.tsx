import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import type { Offerings } from '../plus/purchases-port';

import { itemOf, studioProductIds, type StudioKind } from './catalogue';
import { partOf, PLAIN_LOOK, withPart, type Look } from './look';
import { actionFor, mayWear, owns } from './rules';
import { StudioScreen, type StudioModel } from './studio-screen';

/**
 * The studio on the real phone. It opens on the finishes, wearing what the person wears. Trying
 * on changes the preview only; wearing keeps it; a purchase goes through the same port as Plus,
 * and what was bought is put on.
 */
export function StudioContainer() {
  const router = useRouter();
  const { port, store } = usePlusRuntime();
  const { customer, unlocked, look, member } = usePlusState();
  const [tab, setTab] = useState<StudioKind>('finish');
  const [trying, setTrying] = useState<Look>(look);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [busy, setBusy] = useState(false);
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

  const facts = { ownedItems: customer.ownedItems, capabilities: unlocked.capabilities };
  const focus = itemOf(tab, partOf(trying, tab));
  const price = focus.productId ? (offerings?.items[focus.productId]?.priceText ?? null) : null;
  const wearFocus = () => store.wear(withPart(look, focus.kind, focus.id));
  return (
    <StudioScreen
      model={{
        tab,
        trying,
        focus,
        action: actionFor(focus, look, facts),
        price,
        held: owns(focus, facts.ownedItems) ? 'owned' : mayWear(focus, facts) ? 'plus' : null,
        number: member.number,
        busy,
        notice,
      }}
      actions={{
        close: () => (router.canGoBack() ? router.back() : router.replace('/')),
        showTab: setTab,
        tryOn: (item) => {
          setTrying((before) => withPart(before, item.kind, item.id));
          setNotice(port.available ? null : 'unavailable');
        },
        wear: () => {
          // The rule decides again here, whatever the screen drew.
          if (mayWear(focus, facts)) void wearFocus();
        },
        takeOff: () => {
          setTrying(PLAIN_LOOK);
          void store.wear(PLAIN_LOOK);
        },
        buy: () => {
          if (focus.productId === null || busy) return;
          setBusy(true);
          setNotice(null);
          void port
            .purchase(focus.productId)
            .then(async (outcome) => {
              if (outcome.kind === 'purchased') {
                await store.accept(outcome.customer);
                await wearFocus();
              } else if (outcome.kind === 'failed') setNotice('failed');
            })
            .catch(() => setNotice('failed'))
            .finally(() => setBusy(false));
        },
      }}
    />
  );
}
