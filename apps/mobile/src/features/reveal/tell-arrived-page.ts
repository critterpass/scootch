import type { ShareApi } from '../../api/share-api';
import {
  arrivedMonsterKey,
  withShare,
  type KeptShare,
  type KeptShares,
} from '../share/kept-shares';

/**
 * The page a caught monster arrived from, when it still has to hear of the catch: the one kept
 * under the seed the monster is drawn from, and not yet told. `null` for a monster that was made
 * on this phone, one whose page was never remembered, and one whose page has been told.
 */
export function arrivedPageToTell(shares: readonly KeptShare[], seed: string): KeptShare | null {
  const page = shares.find((one) => one.key === arrivedMonsterKey(seed));
  return page === undefined || page.caughtTold === true ? null : page;
}

/**
 * Tells the page a monster arrived from that it is caught, once, the way a page this phone shared
 * is told. This phone holds no token for it: the server knows the phone that took the monster in.
 * A failure rejects and leaves the page untold, to be told the next time its reveal is shown.
 */
export async function tellArrivedPageOfCatch(
  pages: { readonly api: Pick<ShareApi, 'monsterCaught'>; readonly kept: KeptShares },
  monster: { readonly seed: string; readonly catchMinutes: number },
): Promise<'told' | 'nothing_to_tell'> {
  const page = arrivedPageToTell(await pages.kept.read(), monster.seed);
  if (page === null) return 'nothing_to_tell';
  await pages.api.monsterCaught(page.id, page.unshareToken, Math.max(1, monster.catchMinutes));
  await pages.kept.write(withShare(await pages.kept.read(), { ...page, caughtTold: true }));
  return 'told';
}
