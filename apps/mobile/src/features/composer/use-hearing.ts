import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { mic } from '../../../modules/phusclass-mic';
import { appHttp } from '../../api/app-http';
import { soundMode } from '../../effects/sound-mode';
import { useLanguage } from '../../i18n/i18n-provider';

import type { Permission } from './composer-machine';
import { listen, type HearingFailure, type Listening } from './hearing-listener';
import type { Heard, OpenSocket, SocketLike } from './hearing-session';
import { createTokenSource, fetchHearingToken, type TokenSource } from './hearing-token';

export interface HearingEvents {
  readonly onHeard: (heard: Heard) => void;
  readonly onEnded: () => void;
  readonly onUnavailable: (why: HearingFailure) => void;
}

export interface Hearing {
  permission(): Promise<Permission>;
  ask(): Promise<boolean>;
  start(): void;
  stop(): void;
  abort(): void;
  /** How loud the voice is now, 0 to 1, eased for drawing; 0 while nothing listens. */
  readonly level: SharedValue<number>;
}

/** A level rises as fast as a voice does and falls back gently, as a meter's needle. */
const RISE = { duration: 70, easing: Easing.out(Easing.quad) } as const;
const FALL = { duration: 240, easing: Easing.out(Easing.quad) } as const;

const openSocket: OpenSocket = (url) => new WebSocket(url) as unknown as SocketLike;

// One token kept ready for the whole app; each hold spends it and the next is fetched behind it.
let tokens: TokenSource | null = null;

/**
 * Hearing through ElevenLabs Scribe Realtime: hold, and the microphone streams to it, with the
 * words coming back as they are heard. No language is named, so English and Vietnamese are both
 * heard whatever the app's language. The audio goes to the transcriber and nowhere else, and
 * nothing is kept on the phone. Without a connection, or without the microphone module (Android,
 * tests), it says so through `onUnavailable` and the composer offers typing.
 */
export function useHearing(events: HearingEvents): Hearing {
  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const latest = useRef(events);
  latest.current = events;
  const listening = useRef<Listening | null>(null);
  const level = useSharedValue(0);

  tokens ??= createTokenSource(fetchHearingToken(appHttp(() => languageRef.current)));
  const source = tokens;

  const permission = useCallback(async (): Promise<Permission> => {
    if (mic === null) return 'granted';
    try {
      const answer = await mic.permission();
      return answer === 'undetermined' ? 'unknown' : answer;
    } catch {
      return 'unknown';
    }
  }, []);

  // Someone who has already let the microphone in will likely hold again: a token waits for them.
  useEffect(() => {
    void permission().then((answer) => {
      if (answer === 'granted' && mic !== null) source.warm();
    });
  }, [permission, source]);

  const ask = useCallback(async (): Promise<boolean> => {
    if (mic === null) return true;
    try {
      return await mic.ask();
    } catch {
      return false;
    }
  }, []);

  const settle = useCallback(() => {
    listening.current = null;
    level.set(withTiming(0, FALL));
    soundMode.restore();
  }, [level]);

  const start = useCallback(() => {
    listening.current?.abort();
    if (mic === null) {
      latest.current.onUnavailable('unavailable');
      return;
    }
    listening.current = listen({
      mic,
      token: () => source.take(),
      open: openSocket,
      events: {
        heard: (heard) => latest.current.onHeard(heard),
        level: (now) => level.set(withTiming(now, now >= level.get() ? RISE : FALL)),
        ended: () => {
          settle();
          source.warm();
          latest.current.onEnded();
        },
        failed: (why) => {
          settle();
          latest.current.onUnavailable(why);
        },
      },
    });
  }, [level, settle, source]);

  const stop = useCallback(() => listening.current?.stop(), []);

  const abort = useCallback(() => {
    if (listening.current === null) return;
    listening.current.abort();
    settle();
  }, [settle]);

  useEffect(() => () => listening.current?.abort(), []);

  return useMemo(
    () => ({ permission, ask, start, stop, abort, level }),
    [permission, ask, start, stop, abort, level],
  );
}
