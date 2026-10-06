import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import type { Offerings } from '../plus/purchases-port';

import {
  owns,
  shelfItem,
  shelfProductIds,
  SHELF_OPENS_ON,
  STANDARD_INK,
  type ShelfItem,
  type ShelfKind,
} from './catalogue';
import { ShelfScreen, type ShelfModel } from './shelf-screen';

const fallback = shelfItem(STANDARD_INK) as ShelfItem;

/**
 * The shelf on the real phone. A purchase goes through the same port as Plus, and the ink the
 * person wears is kept on the phone. Printing the whole app in it is the tokens' work, not this
 * screen's: here it is tried on in the preview and the choice is stored.
 */
export function ShelfContainer() {
  const router = useRouter();
  const { port, store, memory } = usePlusRuntime();
  const { customer } = usePlusState();
  const [kind, setKind] = useState<ShelfKind>('inks');
  const [focus, setFocus] = useState<ShelfItem>(shelfItem(SHELF_OPENS_ON) ?? fallback);
  const [wearing, setWearing] = useState(STANDARD_INK);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ShelfModel['notice']>(port.available ? null : 'unavailable');

  useEffect(() => {
    let current = true;
    void memory
      .read('ink')
      .then((stored) => {
        const item = typeof stored === 'string' ? shelfItem(stored) : null;
        if (current && item) setWearing(item.id);
      })
      .catch(() => undefined);
    void port
      .offerings(shelfProductIds)
      .then((loaded) => {
        if (current) setOfferings(loaded);
      })
      .catch(() => {
        if (current) setNotice('unavailable');
      });
    return () => {
      current = false;
    };
  }, [memory, port]);

  const wear = (id: string) => {
    setWearing(id);
    void memory.write('ink', id).catch(() => undefined);
  };
  const owned = owns(focus, customer.ownedItems);
  return (
    <ShelfScreen
      model={{
        kind,
        focus,
        wearing,
        owned,
        price: focus.productId ? (offerings?.items[focus.productId]?.priceText ?? null) : null,
        busy,
        notice,
      }}
      actions={{
        close: () => (router.canGoBack() ? router.back() : router.replace('/')),
        showKind: setKind,
        focus: (item) => {
          setFocus(item);
          setNotice(port.available ? null : 'unavailable');
        },
        wear: () => {
          if (owned) wear(focus.id);
        },
        takeOff: () => {
          wear(STANDARD_INK);
          setFocus(fallback);
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
                wear(focus.id);
              } else if (outcome.kind === 'failed') setNotice('failed');
            })
            .catch(() => setNotice('failed'))
            .finally(() => setBusy(false));
        },
      }}
    />
  );
}
