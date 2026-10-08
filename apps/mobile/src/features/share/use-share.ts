import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SHARE_FRAMES, type ShareFrame } from '@scootch/art';
import { localDateTime, type TodayState } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { siteBaseUrl } from '../../api/api-config';
import { openRepositories } from '../../data/repositories';
import { loadKeepsakes, type Keepsakes } from '../../state/keepsakes';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { useTogether } from '../../state/together-context';
import { FINISHES, inkOf } from '../studio/catalogue';
import { mayWear } from '../studio/rules';

import { keychainKeptShares } from './native-kept-shares';
import { nativeShareDevice } from './native-share-device';
import {
  linkOfCatch,
  pageOffered,
  saveCatch,
  savePicture,
  shareCatch,
  sharedPageOf,
  sharePicture,
  unshareCatch,
  type CatchShare,
  type SharePages,
} from './share-flow';
import {
  composeShareImage,
  finishOfFrame,
  formatsOffered,
  frameOfFinish,
  takesFrame,
  type ShareDress,
  type ShareFormat,
} from './share-image';
import { dayLog, monthBefore, monthWrap } from './share-logs';
import type { ShareActions, ShareModel } from './share-panel';
import { shareOfferedOn } from './share-rules';
import { isCatch, standalonePicture, type ShareTarget } from './share-target';

export interface ShareHandle {
  /** The composer to draw, or `null` while it is shut. */
  readonly panel: { readonly model: ShareModel; readonly actions: ShareActions } | null;
  /**
   * Opens the composer. A task that may not be shared, and anything at all on a crisis day,
   * opens nothing.
   */
  readonly open: (target: ShareTarget) => void;
}

/** The formats the composer offers for a catch: a poster belongs to a month, not to one catch. */
const forACatch = (formats: readonly ShareFormat[]): ShareFormat[] =>
  formats.filter((format) => format !== 'poster');

/** The composer's state for one screen, on the real phone. */
export function useShare(language: Language, today: Pick<TodayState, 'kind'>): ShareHandle {
  const { pages: api } = useTogether();
  const pages = useMemo<SharePages>(
    () => ({ api, kept: keychainKeptShares, site: siteBaseUrl() }),
    [api],
  );
  const db = useSQLiteContext();
  const runtime = usePlusRuntime();
  const { look, member, unlocked, customer } = usePlusState();
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [format, setFormat] = useState<ShareFormat>('story');
  const [frame, setFrame] = useState<ShareFrame>(() => frameOfFinish(look.finish));
  const [kept, setKept] = useState<Keepsakes | null>(null);
  const [hideTask, setHideTask] = useState(false);
  const [notice, setNotice] = useState<ShareModel['notice']>(null);
  const [pageUp, setPageUp] = useState(false);
  const busy = useRef(false);
  const crisis = today.kind === 'crisis';

  const open = useCallback(
    (next: ShareTarget) => {
      // A month, the world and a week are the person's own, already made only of what may be
      // shared; a catch and a wanted poster ask their task.
      const own = next.kind === 'month' || next.kind === 'world' || next.kind === 'song';
      if (own ? today.kind === 'crisis' : !shareOfferedOn(today, next.task)) return;
      setHideTask(false);
      setNotice(null);
      setPageUp(false);
      setFormat(isCatch(next) ? next.format : 'story');
      // It opens on the frame of the finish that is worn.
      setFrame(frameOfFinish(look.finish));
      setTarget(next);
    },
    [today, look.finish],
  );
  // The day's log and the month are read when the composer opens, and again for each new target.
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
      frame,
    };
  }, [runtime, look, member, unlocked, kept, hideTask, frame]);
  const catchOf = target && isCatch(target) ? target : null;
  useEffect(() => {
    if (!catchOf) return;
    let current = true;
    void sharedPageOf(pages, { card: catchOf.card, format })
      .then((link) => {
        if (current) setPageUp(link !== null);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [catchOf, format, pages]);

  const panel = useMemo(() => {
    if (!target || crisis) return null;
    // Paper and Riso are everyone's; a frame made of a finish is for whoever may wear it.
    const facts = { ownedItems: customer.ownedItems, capabilities: unlocked.capabilities };
    const frames = SHARE_FRAMES.map((id) => {
      const finish = finishOfFrame(id);
      const item = finish === null ? null : FINISHES.find((one) => one.id === finish);
      return { id, locked: item !== null && item !== undefined && !mayWear(item, facts) };
    });
    const usable = frames.find((one) => one.id === frame)?.locked ? 'paper' : frame;
    // A locked frame takes no touch: the composer is reached from the reveal, and nothing is
    // sold there. The way to Plus is where it has always been.
    const chooseFrame = (next: ShareFrame) => {
      if (frames.find((one) => one.id === next)?.locked) return;
      setNotice(null);
      setFrame(next);
    };
    /** One piece of work at a time; a tap while one is out does nothing. */
    const once = (work: () => Promise<void>, sending: boolean) => {
      if (busy.current) return;
      busy.current = true;
      // A picture with no page sends nothing, so nothing is said to be going up.
      setNotice(sending ? 'sending' : null);
      void work()
        .catch(() => setNotice('failed'))
        .finally(() => {
          busy.current = false;
        });
    };
    const shared = { close: () => setTarget(null), setHideTask, setFrame: chooseFrame };

    if (!isCatch(target)) {
      // A picture that stands by itself: a wanted poster, or a month's poster. It has no page.
      const alone = standalonePicture(target, usable, language, kept, hideTask);
      if (alone === null) return null;
      const { image: picture, name } = alone;
      const actions: ShareActions = {
        ...shared,
        setFormat: () => undefined,
        unshare: () => undefined,
        share: () =>
          once(async () => {
            await sharePicture(nativeShareDevice, picture, name);
            setNotice('pictureOnly');
          }, false),
        save: () =>
          once(async () => {
            setNotice(await savePicture(nativeShareDevice, picture, name));
          }, false),
        ...(target.kind === 'song' ? { sound: target.sound } : {}),
      };
      return {
        model: {
          moment: target.kind === 'wanted' ? ('monster' as const) : target.kind,
          image: picture,
          format: 'story' as const,
          formats: [],
          frame: usable,
          frames: target.kind === 'month' ? [] : frames,
          framed: target.kind !== 'month',
          hideTask: target.kind === 'song' && hideTask,
          // Only a week's sleeve prints tasks; a poster, a postcard and a wanted poster name none.
          canHideTask: target.kind === 'song',
          language,
          notice,
          pageUp: false,
          pageOffered: true,
          linkOffered: false,
        },
        actions,
      };
    }

    const caught = target;
    const formats = forACatch(formatsOffered(dress));
    // A format that can no longer be made (the day's log is gone) falls back to the story.
    const shown = formats.includes(format) ? format : 'story';
    const share: CatchShare = {
      ...caught,
      format: shown,
      dress: { ...dress, frame: usable },
      hideTask,
      language,
    };
    const page = pageOffered(share);
    const actions: ShareActions = {
      ...shared,
      setFormat: (next) => {
        setNotice(null);
        setFormat(next);
      },
      share: () =>
        once(async () => {
          // Nothing reaches the sheet, and nothing reads as shared, unless the page went up.
          const result = await shareCatch(nativeShareDevice, pages, share);
          setPageUp(result === 'shared');
          setNotice(
            result === 'shared' ? 'shared' : result === 'shared_picture' ? 'pictureOnly' : 'failed',
          );
        }, page),
      unshare: () =>
        once(async () => {
          await unshareCatch(pages, share);
          setPageUp(false);
          setNotice('unshared');
        }, true),
      save: () =>
        once(async () => {
          const result = await saveCatch(nativeShareDevice, share);
          setNotice(result === 'not_offered' ? 'failed' : result);
        }, false),
      ...(page && nativeShareDevice.copyText
        ? {
            copyLink: () =>
              once(async () => {
                const link = await linkOfCatch(pages, share);
                if (link === null) return setNotice('failed');
                await nativeShareDevice.copyText?.(link);
                setPageUp(true);
                setNotice('linkCopied');
              }, true),
          }
        : {}),
    };
    return {
      model: {
        moment: 'caught' as const,
        image: composeShareImage(shown, caught.card, { hideTask, language }, share.dress),
        format: shown,
        formats,
        frame: usable,
        frames,
        framed: takesFrame(shown),
        hideTask,
        canHideTask: shown === 'story' || shown === 'card' || shown === 'receipt',
        language,
        notice,
        pageUp,
        pageOffered: page,
        linkOffered: page,
      },
      actions,
    };
  }, [
    target,
    format,
    frame,
    dress,
    kept,
    hideTask,
    notice,
    pageUp,
    language,
    pages,
    crisis,
    customer.ownedItems,
    unlocked.capabilities,
  ]);

  return { panel, open };
}
