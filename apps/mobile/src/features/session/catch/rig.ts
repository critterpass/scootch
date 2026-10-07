import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import type { MonsterRow, SessionEvent } from '@scootch/domain';

import type { Translate } from '../../../i18n/i18n-provider';
import type { SessionInks } from '../ui/session-inks';

import type { Caption, CaptionName } from './captions';
import type { CatchKind } from './catch-kinds';
import type { HintHandle } from './hint';

/** Where a scene stands: the trap setting, the gesture unlocked, the catch landing, and caught. */
export type SceneState = 'during' | 'ready' | 'busy' | 'caught';
export type MonsterMood = 'idle' | 'nervous' | 'caught';

/** The sounds a catch makes. Each carries its own taps, so what is heard is also felt. */
export type CatchCue =
  | 'tick'
  | 'cancel'
  | 'aww'
  | 'send'
  | 'catch-slam'
  | 'catch-swoosh'
  | 'catch-yank'
  | 'catch-splash'
  | 'catch-cinch'
  | 'catch-peel'
  | 'catch-stick'
  | 'catch-float'
  | 'catch-pop'
  | 'catch-slurp'
  | 'catch-fold'
  | 'catch-seal'
  | 'catch-landed';

/** What a scene asks of the screen it is drawn on. */
export interface SceneHost {
  /** The caption for how things stand. It gives way to a reaction for a moment. */
  readonly status: (caption: Caption) => void;
  /** A caption for what the person just did. It holds for a moment, then the status is back. */
  readonly react: (caption: Caption) => void;
  /** The gesture was tried before the thing was said to be done. */
  readonly early: () => void;
  readonly cue: (cue: CatchCue) => void;
  /** Jolts the whole drawing, as a slam does. */
  readonly shake: (amount: number) => void;
  /** The monster is caught: the finish is sent, once. */
  readonly landed: () => void;
  /** The catch has played out, with its own word for it. */
  readonly won: (caption: CaptionName) => void;
  /** Sends a finish event and settles when the store has answered: the vacuum's hold. */
  readonly sendFinish: (event: SessionEvent) => Promise<void>;
}

/** A touch on the drawing, in the board's points. */
export interface SceneTouch {
  readonly down: (x: number, y: number) => void;
  readonly move: (x: number, y: number) => void;
  readonly up: (x: number, y: number) => void;
}

export interface SceneProps {
  readonly kind: CatchKind;
  readonly monster: MonsterRow;
  readonly inks: SessionInks;
  readonly t: Translate;
  /** How far the trap has set, from 0 to 1. */
  readonly progress: number;
  /** The gesture is unlocked. */
  readonly ready: boolean;
  /** Already caught when the scene is first drawn: it shows how the catch ends. */
  readonly ended: boolean;
  /** A capture: one frame, and nothing runs. */
  readonly still: boolean;
  /** How many monsters are already in the binder; `null` until that is known. */
  readonly caughtCount: number | null;
  /** The other monsters caught this month, newest last, for the sticker book. */
  readonly monthMates: readonly MonsterRow[];
  /** The month's name, for the sticker book. */
  readonly monthName: string;
  readonly host: SceneHost;
  /** Where the scene leaves its touch handlers for the screen to call. */
  readonly touch: RefObject<SceneTouch | null>;
}

/** A scene's own part: what moves each frame, and what a touch does. */
export interface SceneHandlers {
  /** Every frame: `t` in seconds since the scene was drawn, `dt` since the last frame. */
  readonly tick?: (t: number, dt: number) => void;
  /** A touch begins. Returning false lets it go: no move or up follows. */
  readonly down?: (x: number, y: number) => boolean;
  readonly move?: (x: number, y: number) => void;
  readonly up?: (x: number, y: number) => void;
  /**
   * The gesture this catch is waiting for, as a path on the board. It is traced as a hint once
   * the catch has been unlocked and left alone for a moment.
   */
  readonly hint?: () => string;
}

type Ease = (t: number) => number;

export interface Rig {
  /** The scene between frames. Handlers read and write it; nothing draws from it. */
  readonly m: { state: SceneState; p: number; drag: boolean };
  /** Runs `step` from 0 to 1 over `ms`, eased, then `done`. Dropped if the scene has gone. */
  readonly tw: (
    ms: number,
    step: (k: number) => void,
    ease?: Ease | null,
    done?: () => void,
  ) => void;
  /** Runs `then` after `ms`, unless the scene has gone. */
  readonly at: (ms: number, then: () => void) => void;
  readonly mood: MonsterMood;
  readonly setMood: (mood: MonsterMood) => void;
  /** The status caption, said only when it changes. */
  readonly say: (name: CaptionName, params?: Caption['params']) => void;
  /**
   * The catch has landed: the finish is sent and the scene is caught. `sent` says the finish has
   * gone already, as the vacuum's hold sends its own.
   */
  readonly win: (caption: CaptionName, sent?: boolean) => void;
  /** A touch that came too early: the "not yet" caption, and the small refusing sound. */
  readonly refuse: () => void;
  /** Where the scene puts its `Hint`, for the rig to run. */
  readonly hint: RefObject<HintHandle | null>;
}

/** What the rig keeps between frames. */
/** How long an unlocked catch is left alone before its gesture is hinted at. */
const HINT_AFTER = 1.4;

interface Inner {
  /** When the catch last became ready or was last let go of, in seconds; `null` while it is not. */
  restedAt: number | null;
  /** Goes up when the scene goes away, so nothing started before then carries on. */
  gen: number;
  said: string;
  mood: MonsterMood;
  readonly m: Rig['m'];
}

/** How quickly the drawn progress follows the real one: a jump (an early "done") is eased in. */
const FOLLOW = 5;

/**
 * What every catch scene runs on: one frame loop, tweens and timers that die with the scene, the
 * state the gesture is judged against, and the touch handlers the screen calls. A scene keeps its
 * own numbers and writes them to shared values each frame, so everything that moves is moved from
 * one place.
 */
export function useRig(props: SceneProps, handlers: SceneHandlers): Rig {
  const { touch, still, ended } = props;
  const [mood, setMoodState] = useState<MonsterMood>(ended ? 'caught' : 'idle');
  const latest = useRef({ props, handlers });
  latest.current = { props, handlers };
  const inner = useRef<Inner>({
    restedAt: null,
    gen: 0,
    said: '',
    mood: ended ? 'caught' : 'idle',
    m: { state: ended ? 'caught' : 'during', p: props.progress, drag: false },
  }).current;

  const hint = useRef<HintHandle | null>(null);
  const rig = useMemo<Rig>(() => {
    const { m } = inner;
    const alive = (gen: number) => gen === inner.gen;
    return {
      m,
      mood: 'idle',
      tw: (ms, step, ease, done) => {
        const gen = inner.gen;
        const from = Date.now();
        const frame = () => {
          if (!alive(gen)) return;
          const k = Math.min(1, (Date.now() - from) / ms);
          step(ease ? ease(k) : k);
          if (k < 1) requestAnimationFrame(frame);
          else done?.();
        };
        requestAnimationFrame(frame);
      },
      at: (ms, then) => {
        const gen = inner.gen;
        setTimeout(() => {
          if (alive(gen)) then();
        }, ms);
      },
      setMood: (next) => {
        if (inner.mood === next) return;
        inner.mood = next;
        setMoodState(next);
      },
      say: (name, params) => {
        const key = `${name}:${params ? JSON.stringify(params) : ''}`;
        if (inner.said === key) return;
        inner.said = key;
        latest.current.props.host.status(params ? { name, params } : { name });
      },
      win: (caption, sent = false) => {
        m.state = 'caught';
        m.drag = false;
        if (!sent) latest.current.props.host.landed();
        latest.current.props.host.won(caption);
      },
      refuse: () => {
        latest.current.props.host.early();
        latest.current.props.host.cue('cancel');
      },
      hint,
    };
  }, [inner, hint]);

  // The touch handlers the screen calls: a touch the scene lets go of is followed no further.
  useEffect(() => {
    const { m } = inner;
    touch.current = {
      down: (x, y) => {
        const down = latest.current.handlers.down;
        if (!down || down(x, y) === false) return;
        m.drag = true;
      },
      move: (x, y) => {
        if (m.drag) latest.current.handlers.move?.(x, y);
      },
      up: (x, y) => {
        if (!m.drag) return;
        m.drag = false;
        latest.current.handlers.up?.(x, y);
      },
    };
    return () => {
      touch.current = null;
    };
  }, [inner, touch]);

  // The frame loop. A capture draws one frame and stops.
  useEffect(() => {
    const { m } = inner;
    const gen = inner.gen;
    const sync = (dt: number) => {
      const now = latest.current.props;
      if (m.state === 'during' || m.state === 'ready') m.state = now.ready ? 'ready' : 'during';
      const gap = now.progress - m.p;
      m.p = Math.abs(gap) < 0.0005 || dt <= 0 ? now.progress : m.p + gap * Math.min(1, dt * FOLLOW);
    };
    if (still) {
      sync(0);
      latest.current.handlers.tick?.(0, 0);
      return undefined;
    }
    const began = Date.now();
    let last = began;
    let frame = 0;
    const loop = () => {
      if (gen !== inner.gen) return;
      const now = Date.now();
      // A stalled frame counts for no more than a twentieth of a second, so nothing jumps.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sync(dt);
      const seconds = (now - began) / 1000;
      latest.current.handlers.tick?.(seconds, dt);
      // Unlocked and untouched for a moment, the gesture is traced; a finger puts it away.
      const resting = m.state === 'ready' && !m.drag;
      if (!resting) inner.restedAt = null;
      else inner.restedAt ??= seconds;
      const since = inner.restedAt === null ? -1 : seconds - inner.restedAt - HINT_AFTER;
      hint.current?.show(since >= 0 ? since : null, latest.current.handlers.hint?.() ?? '');
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      inner.gen += 1;
      cancelAnimationFrame(frame);
    };
  }, [inner, still, hint]);

  // The mood is state, so a change of it draws again without remaking the rig.
  return useMemo(() => ({ ...rig, mood }), [rig, mood]);
}
