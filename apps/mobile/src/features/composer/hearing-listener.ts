import type { HearingTokenResponse } from '@phusclass/domain';

import type { Mic } from '../../../modules/phusclass-mic';
import { ApiClientError } from '../../api/api-error';

import {
  openHearingSession,
  type Heard,
  type HearingSession,
  type OpenSocket,
} from './hearing-session';

/** Why nothing could be heard: no connection, or the microphone or the service would not. */
export type HearingFailure = 'offline' | 'unavailable';

export interface ListenEvents {
  readonly heard: (heard: Heard) => void;
  /** How loud the voice is, 0 to 1, about 25 times a second while the microphone is on. */
  readonly level: (level: number) => void;
  /** Everything said has arrived; the microphone is already off. */
  readonly ended: () => void;
  /** Nothing could be heard; the microphone is already off. */
  readonly failed: (why: HearingFailure) => void;
}

export interface Listening {
  /** The finger is up: the last words arrive, then `ended`. */
  readonly stop: () => void;
  /** Closes everything with nothing more reported. */
  readonly abort: () => void;
}

/** Audio kept while the token comes: half a minute of chunks. */
const MAX_EARLY_CHUNKS = 300;

function failureOf(error: unknown): HearingFailure {
  return error instanceof ApiClientError && error.code === 'network' ? 'offline' : 'unavailable';
}

/**
 * Listens through the transcriber. The microphone starts the moment the finger goes down, and its
 * audio is kept while the token arrives and the socket opens, so nothing said early is lost. Every
 * failure before words, from the microphone to the socket, reports `failed` with the microphone
 * already released.
 */
export function listen({
  mic,
  token,
  open,
  events,
}: {
  readonly mic: Mic;
  readonly token: () => Promise<HearingTokenResponse>;
  readonly open: OpenSocket;
  readonly events: ListenEvents;
}): Listening {
  const early: string[] = [];
  let session: HearingSession | null = null;
  let over = false;
  let stopped = false;

  const unsubscribe: (() => void)[] = [];
  const release = async () => {
    for (const stop of unsubscribe.splice(0)) stop();
    await mic.stop().catch(() => undefined);
    events.level(0);
  };
  const finish = (report: () => void) => {
    if (over) return;
    over = true;
    session?.abort();
    void release().then(report);
  };
  const failed = (why: HearingFailure) => finish(() => events.failed(why));
  const stop = () => {
    if (stopped || over) return;
    stopped = true;
    // The microphone sends what it has left before it stops; then the last phrase is settled.
    void mic
      .stop()
      .catch(() => undefined)
      .then(() => session?.finish());
  };

  unsubscribe.push(
    mic.onAudio((chunk) => {
      if (session !== null) session.send(chunk);
      else if (early.length < MAX_EARLY_CHUNKS) early.push(chunk);
    }),
    mic.onLevel((level) => {
      if (!over) events.level(level);
    }),
    // The system took the microphone (a call, Siri): end with what was heard, as letting go would.
    mic.onStop(stop),
  );

  const run = async () => {
    const asked = token();
    try {
      await mic.start();
    } catch {
      asked.catch(() => undefined);
      return failed('unavailable');
    }
    let minted: HearingTokenResponse;
    try {
      minted = await asked;
    } catch (error) {
      return failed(failureOf(error));
    }
    if (over) return;
    session = openHearingSession({
      token: minted,
      open,
      events: {
        heard: (heard) => {
          if (!over) events.heard(heard);
        },
        ended: () => finish(events.ended),
        failed: () => failed('unavailable'),
      },
    });
    for (const chunk of early.splice(0)) session.send(chunk);
    if (stopped) session.finish();
  };
  void run();

  return {
    stop,
    abort: () => {
      if (over) return;
      over = true;
      session?.abort();
      void release();
    },
  };
}
