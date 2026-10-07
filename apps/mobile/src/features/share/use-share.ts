import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  localDateTime,
  type CardData,
  type SignedWords,
  type TaskRow,
  type TodayState,
} from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { siteBaseUrl } from '../../api/api-config';
import { openRepositories } from '../../data/repositories';
import { loadKeepsakes, type Keepsakes } from '../../state/keepsakes';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { useTogether } from '../../state/together-context';
import { inkOf } from '../studio/catalogue';

import { keychainKeptShares } from './native-kept-shares';
import { nativeShareDevice } from './native-share-device';
import {
  pageOffered,
  saveCatch,
  shareCatch,
  sharedPageOf,
  unshareCatch,
  type CatchShare,
  type SharePages,
} from './share-flow';
import { formatsOffered, type ShareDress, type ShareFormat } from './share-image';
import { dayLog, monthBefore, monthWrap } from './share-logs';
import type { ShareActions, ShareModel } from './share-panel';
import { shareOfferedOn } from './share-rules';

export interface ShareTarget {
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly card: CardData;
  /** The signature stored with the monster's words; `null` when it has none. */
  readonly signed: SignedWords | null;
  /** The picture the panel opens on. */
  readonly format: ShareFormat;
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
  const db = useSQLiteContext();
  const runtime = usePlusRuntime();
  const { look, member, unlocked } = usePlusState();
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [format, setFormat] = useState<ShareFormat>('story');
  const [kept, setKept] = useState<Keepsakes | null>(null);
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
      setFormat(next.format);
      setTarget(next);
    },
    [today],
  );
  // The receipt and the poster are counted from the phone's own tables, read as the panel opens.
  useEffect(() => {
    if (!target) return;
    let current = true;
    void loadKeepsakes(openRepositories(db))
      .then((loaded) => {
        if (current) setKept(loaded);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [target, db]);
  const dress = useMemo<ShareDress>(() => {
    const timeZone = runtime.timeZone();
    const date = localDateTime(runtime.now(), timeZone).date;
    const before = monthBefore(date);
    const { accent, deep, highlight, blush } = inkOf(look.ink).colours;
    return {
      finish: look.finish,
      ...(look.ink === 'tangerine'
        ? {}
        : { body: { body: accent, shade: deep, highlight, blush } }),
      member: unlocked.plus ? member.number : null,
      plus: unlocked.plus,
      day: kept ? dayLog(kept.monsters, kept.tasks, date, timeZone, hideTask) : null,
      month: kept ? monthWrap(kept.monsters, kept.tasks, before.year, before.month) : null,
    };
  }, [runtime, look, member, unlocked, kept, hideTask]);
  // Whether a page for this catch is already up, so that it can be taken down from here.
  useEffect(() => {
    if (!target) return;
    let current = true;
    void sharedPageOf(pages, { card: target.card, format })
      .then((link) => {
        if (current) setPageUp(link !== null);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [target, format, pages]);

  const panel = useMemo(() => {
    if (!target || crisis) return null;
    const formats = formatsOffered(dress);
    // A format that can no longer be made (the day's log is gone) falls back to the story.
    const shown = formats.includes(format) ? format : 'story';
    const share: CatchShare = { ...target, format: shown, dress, hideTask, language };
    const page = pageOffered(share);
    /** One call to the server at a time; a tap while one is out does nothing. */
    const once = (work: () => Promise<void>) => {
      if (busy.current) return;
      busy.current = true;
      // A picture with no page sends nothing, so nothing is said to be going up.
      setNotice(page ? 'sending' : null);
      void work()
        .catch(() => setNotice('failed'))
        .finally(() => {
          busy.current = false;
        });
    };
    const actions: ShareActions = {
      close: () => setTarget(null),
      setFormat: (next) => {
        setNotice(null);
        setFormat(next);
      },
      setHideTask,
      share: () =>
        once(async () => {
          // Nothing reaches the sheet, and nothing reads as shared, unless the page went up.
          const result = await shareCatch(nativeShareDevice, pages, share);
          setPageUp(result === 'shared');
          setNotice(
            result === 'shared' ? 'shared' : result === 'shared_picture' ? 'pictureOnly' : 'failed',
          );
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
      model: {
        card: target.card,
        format: shown,
        formats,
        dress,
        language,
        hideTask,
        notice,
        pageUp,
        pageOffered: page,
      },
      actions,
    };
  }, [target, format, dress, hideTask, notice, pageUp, language, pages, crisis]);

  return { panel, open };
}
