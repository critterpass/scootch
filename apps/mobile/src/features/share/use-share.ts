import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CardData, TaskRow, TodayState } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { siteBaseUrl } from '../../api/api-config';
import { useTogether } from '../../state/together-context';

import { keychainKeptShares } from './native-kept-shares';
import { nativeShareDevice } from './native-share-device';
import {
  saveCatch,
  shareCatch,
  sharedPageOf,
  unshareCatch,
  type CatchShare,
  type SharePages,
} from './share-flow';
import type { ShareActions, ShareModel } from './share-panel';
import { shareOfferedOn } from './share-rules';

export interface ShareTarget {
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly card: CardData;
  readonly kind: 'story' | 'card';
}

export interface ShareHandle {
  /** The panel to draw, or `null` while it is shut. */
  readonly panel: { readonly model: ShareModel; readonly actions: ShareActions } | null;
  /** Opens the panel. A task that may not be shared, and any task on a crisis day, opens nothing. */
  readonly open: (target: ShareTarget) => void;
}

/** The share panel's state for one screen, on the real phone. */
export function useShare(language: Language, today: Pick<TodayState, 'kind'>): ShareHandle {
  const { pages: api } = useTogether();
  const pages = useMemo<SharePages>(
    () => ({ api, kept: keychainKeptShares, site: siteBaseUrl() }),
    [api],
  );
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [hideTask, setHideTask] = useState(false);
  const [notice, setNotice] = useState<ShareModel['notice']>(null);
  const [pageUp, setPageUp] = useState(false);
  const busy = useRef(false);
  const crisis = today.kind === 'crisis';

  const open = useCallback(
    (next: ShareTarget) => {
      if (!shareOfferedOn(today, next.task)) return;
      setHideTask(false);
      setNotice(null);
      setPageUp(false);
      setTarget(next);
    },
    [today],
  );
  // Whether a page for this catch is already up, so that it can be taken down from here.
  useEffect(() => {
    if (!target) return;
    let current = true;
    void sharedPageOf(pages, { ...target, hideTask: false, language })
      .then((link) => {
        if (current) setPageUp(link !== null);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [target, pages, language]);

  const panel = useMemo(() => {
    if (!target || crisis) return null;
    const share: CatchShare = { ...target, hideTask, language };
    /** One call to the server at a time; a tap while one is out does nothing. */
    const once = (work: () => Promise<void>) => {
      if (busy.current) return;
      busy.current = true;
      setNotice('sending');
      void work()
        .catch(() => setNotice('failed'))
        .finally(() => {
          busy.current = false;
        });
    };
    const actions: ShareActions = {
      close: () => setTarget(null),
      setHideTask,
      share: () =>
        once(async () => {
          // Nothing reaches the sheet, and nothing reads as shared, unless the page went up.
          const result = await shareCatch(nativeShareDevice, pages, share);
          setPageUp(result === 'shared');
          setNotice(result === 'shared' ? 'shared' : 'failed');
        }),
      unshare: () =>
        once(async () => {
          await unshareCatch(pages, share);
          setPageUp(false);
          setNotice('unshared');
        }),
      save: () => {
        saveCatch(nativeShareDevice, share)
          .then((result) => setNotice(result === 'not_offered' ? 'failed' : result))
          .catch(() => setNotice('failed'));
      },
    };
    return {
      model: { card: target.card, kind: target.kind, language, hideTask, notice, pageUp },
      actions,
    };
  }, [target, hideTask, notice, pageUp, language, pages, crisis]);

  return { panel, open };
}
