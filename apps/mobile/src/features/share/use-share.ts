import { useCallback, useMemo, useState } from 'react';

import type { CardData, TaskRow } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { nativeShareDevice } from './native-share-device';
import { saveCatch, shareCatch, type CatchShare } from './share-flow';
import type { ShareActions, ShareModel } from './share-panel';
import { shareOffered } from './share-rules';

export interface ShareTarget {
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly card: CardData;
  readonly kind: 'story' | 'card';
}

export interface ShareHandle {
  /** The panel to draw, or `null` while it is shut. */
  readonly panel: { readonly model: ShareModel; readonly actions: ShareActions } | null;
  /** Opens the panel. A task that may not be shared opens nothing. */
  readonly open: (target: ShareTarget) => void;
}

/** The share panel's state for one screen, on the real phone. */
export function useShare(language: Language): ShareHandle {
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [hideTask, setHideTask] = useState(false);
  const [notice, setNotice] = useState<ShareModel['notice']>(null);

  const open = useCallback((next: ShareTarget) => {
    if (!shareOffered(next.task)) return;
    setHideTask(false);
    setNotice(null);
    setTarget(next);
  }, []);

  const panel = useMemo(() => {
    if (!target) return null;
    const share: CatchShare = { ...target, hideTask, language };
    const actions: ShareActions = {
      close: () => setTarget(null),
      setHideTask,
      share: () => {
        shareCatch(nativeShareDevice, share).catch(() => setNotice('failed'));
      },
      save: () => {
        saveCatch(nativeShareDevice, share)
          .then((result) => setNotice(result === 'not_offered' ? 'failed' : result))
          .catch(() => setNotice('failed'));
      },
    };
    return { model: { card: target.card, kind: target.kind, language, hideTask, notice }, actions };
  }, [target, hideTask, notice, language]);

  return { panel, open };
}
