import { useRouter } from 'expo-router';
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
  guessOffered,
  takesFrame,
  type ShareDress,
  MONTH_FORMATS,
  type MonthFormat,
  type ShareFormat,
} from './share-image';
import { dayLog, monthBefore, monthWrap } from './share-logs';
import type { ShareActions, ShareModel } from './share-panel';
import { requestShare, SHARE_ROUTE, type ShareRequest } from './share-request';
import { shareOfferedOn } from './share-rules';
import { isCatch, standalonePicture, type ShareTarget } from './share-target';

export interface ShareHandle {
  /**
   * Opens the composer, as a sheet over the screen that asked. A task that may not be shared,
   * and anything at all on a crisis day, opens nothing.
   */
  readonly open: (target: ShareTarget) => void;
}

/**
 * The way to the composer from a screen. `onLocked` is what a tap on a locked frame does there:
 * a screen that may sell hands over its own way to the Plus sheet, and the reveal hands nothing.
 */
export function useShare(today: Pick<TodayState, 'kind'>, onLocked?: () => void): ShareHandle {
  const router = useRouter();
  const open = useCallback(
    (target: ShareTarget) => {
      // A month, the world and a week are the person's own, already made only of what may be
      // shared; a catch and a wanted poster ask their task.
      const own = target.kind === 'month' || target.kind === 'world' || target.kind === 'song';
      if (own ? today.kind === 'crisis' : !shareOfferedOn(today, target.task)) return;
      requestShare({ target, ...(onLocked ? { onLocked } : {}) });
      router.push(SHARE_ROUTE);
    },
    [today, onLocked, router],
  );
  return useMemo(() => ({ open }), [open]);
}

/** The formats the composer offers for a catch: a poster belongs to a month, not to one catch. */
const forACatch = (formats: readonly ShareFormat[]): ShareFormat[] =>
  formats.filter((format) => format !== 'poster');

/**
 * The composer's state for one request, on the real phone: the picture as it will be sent, what
 * it can be sent as, and where it goes. `null` when there is nothing to show (a crisis day, a
 * month not read yet).
 */
export function useComposer(
  language: Language,
  today: Pick<TodayState, 'kind'>,
  request: ShareRequest | null,
  close: () => void,
): { readonly model: ShareModel; readonly actions: ShareActions } | null {
  const { pages: api } = useTogether();
  const pages = useMemo<SharePages>(
    () => ({ api, kept: keychainKeptShares, site: siteBaseUrl() }),
    [api],
  );
  const db = useSQLiteContext();
  const runtime = usePlusRuntime();
  const { look, member, unlocked, customer } = usePlusState();
  const target = request?.target ?? null;
  const onLocked = request?.onLocked;
  // A month opens as the leaf the person was looking at; its poster is the other style.
  const [format, setFormat] = useState<ShareFormat>(() =>
    target && isCatch(target) ? target.format : target?.kind === 'month' ? 'page' : 'story',
  );
  // It opens on the frame of the finish that is worn.
  const [frame, setFrame] = useState<ShareFrame>(() => frameOfFinish(look.finish));
  const [kept, setKept] = useState<Keepsakes | null>(null);
  const [hideTask, setHideTask] = useState(false);
  // The guess line is on the story until the person takes it off.
  const [showGuess, setShowGuess] = useState(true);
  const [notice, setNotice] = useState<ShareModel['notice']>(null);
  const [pageUp, setPageUp] = useState(false);
  const busy = useRef(false);
  const crisis = today.kind === 'crisis';

  // The day's log and the month are read when the composer opens.
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
    // A locked frame asks the screen the composer was opened from. A screen that may sell opens
    // the Plus sheet; the reveal gave no answer, and there a locked frame rests.
    const chooseFrame = (next: ShareFrame) => {
      if (frames.find((one) => one.id === next)?.locked) return onLocked?.();
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
    const shared = { close, setHideTask, setFrame: chooseFrame };

    if (!isCatch(target)) {
      // A picture that stands by itself: a wanted poster, or a month's poster. It has no page.
      const ofMonth = target.kind === 'month';
      const style: MonthFormat = format === 'poster' ? 'poster' : 'page';
      const alone = standalonePicture(target, usable, language, kept, hideTask, style);
      if (alone === null) return null;
      const { image: picture, name } = alone;
      const actions: ShareActions = {
        ...shared,
        // Only a month has more than one style to choose between.
        setFormat: (next) => {
          if (!ofMonth) return;
          setNotice(null);
          setFormat(next);
        },
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
          format: ofMonth ? style : ('story' as const),
          formats: ofMonth ? MONTH_FORMATS : [],
          frame: usable,
          framesOpen: onLocked !== undefined,
          frames: ofMonth ? [] : frames,
          framed: !ofMonth,
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
    // The guess was frozen onto the monster at the catch; the card itself does not carry it.
    const guess =
      kept?.monsters.find(
        (one) => one.spec.seed === caught.card.monster.seed && one.number === caught.card.number,
      )?.guessMinutes ?? null;
    const guessed = guessOffered(shown, guess);
    // The picture that is sent is composed from this share, so the guess goes out with it.
    const share: CatchShare = {
      ...caught,
      format: shown,
      dress: { ...dress, frame: usable },
      hideTask,
      language,
      guessMinutes: guessed && showGuess ? guess : null,
    };
    const page = pageOffered(share);
    const actions: ShareActions = {
      ...shared,
      setFormat: (next) => {
        setNotice(null);
        setFormat(next);
      },
      setGuess: setShowGuess,
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
        image: composeShareImage(shown, caught.card, share, share.dress),
        format: shown,
        formats,
        frame: usable,
        framesOpen: onLocked !== undefined,
        frames,
        framed: takesFrame(shown),
        hideTask,
        canHideTask: shown === 'story' || shown === 'card' || shown === 'receipt',
        ...(guessed ? { guess: showGuess } : {}),
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
    showGuess,
    notice,
    pageUp,
    language,
    pages,
    crisis,
    customer.ownedItems,
    unlocked.capabilities,
    onLocked,
    close,
  ]);

  return panel;
}
