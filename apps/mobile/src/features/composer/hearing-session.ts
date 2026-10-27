import type { HearingTokenResponse } from '@phusclass/domain';

import { audioMessage, COMMIT_MESSAGE, readScribe, socketUrl } from './scribe-protocol';

/** The part of a WebSocket the session uses, so tests can stand one in. */
export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  readonly readyState: number;
  send(data: string): void;
  close(): void;
}

export type OpenSocket = (url: string) => SocketLike;

/** Everything heard so far, and the end of it that is still a guess. */
export interface Heard {
  readonly words: string;
  /** The phrase still being spoken: Scribe may change it until it settles. */
  readonly pending: string;
}

export interface HearingSessionEvents {
  readonly heard: (heard: Heard) => void;
  /** Everything said has arrived. */
  readonly ended: () => void;
  /** The connection failed before any words: nothing can be heard this time. */
  readonly failed: () => void;
}

export interface HearingSession {
  /** One chunk of 16 kHz mono 16-bit PCM, base64. Held until the socket opens. */
  readonly send: (chunk: string) => void;
  /** No more audio: the last phrase settles, then `ended`. */
  readonly finish: () => void;
  /** Closes at once with nothing more reported. */
  readonly abort: () => void;
}

/** How long the socket may take to open. */
export const OPEN_TIMEOUT_MS = 5_000;
/** After the last audio, how long the last phrase may take to settle. */
export const FINISH_TIMEOUT_MS = 2_500;
/** A hold longer than this ends with what was heard. */
export const MAX_SESSION_MS = 120_000;
/** Audio held while the socket opens: a minute of chunks. */
const MAX_HELD_CHUNKS = 600;

const OPEN = 1;

/**
 * One hold of the microphone, streamed to ElevenLabs Scribe Realtime. Audio that arrives before
 * the socket opens is held and sent in order, so the first words are never lost to the
 * connection. Scribe's voice detector settles each phrase after a pause; `finish` settles the last
 * one at once. A failure before any words reports `failed`; after words, or after the last phrase
 * was asked for, the session ends with what it heard.
 */
export function openHearingSession({
  token,
  open,
  events,
}: {
  readonly token: HearingTokenResponse;
  readonly open: OpenSocket;
  readonly events: HearingSessionEvents;
}): HearingSession {
  const held: string[] = [];
  const settled: string[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let pending = '';
  let socket: SocketLike | null = null;
  let done = false;
  let opened = false;
  let finishing = false;
  let committed = false;
  let heardAny = false;

  const after = (ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  };
  const close = () => {
    done = true;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    if (socket === null) return;
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    try {
      socket.close();
    } catch {
      // Already closed.
    }
  };
  const end = () => {
    if (done) return;
    close();
    events.ended();
  };
  const fail = () => {
    if (done) return;
    // Words already heard, or the last phrase asked for on a working socket: keep what there is.
    if (heardAny || committed) return end();
    close();
    events.failed();
  };
  const tell = () => {
    const words = [...settled, pending].filter((part) => part !== '').join(' ');
    if (words !== '') heardAny = true;
    events.heard({ words, pending });
  };
  const commit = () => {
    if (committed || socket?.readyState !== OPEN) return;
    committed = true;
    socket.send(COMMIT_MESSAGE);
    after(FINISH_TIMEOUT_MS, end);
  };

  try {
    socket = open(socketUrl(token));
  } catch {
    // No socket at all: report on the next tick, once the caller holds the session.
    after(0, fail);
  }

  if (socket !== null) {
    const live = socket;
    live.onopen = () => {
      if (done) return;
      opened = true;
      for (const chunk of held.splice(0)) live.send(audioMessage(chunk));
      if (finishing) commit();
    };
    live.onmessage = ({ data }) => {
      if (done) return;
      const reading = readScribe(data);
      switch (reading.kind) {
        case 'partial':
          pending = reading.text.trim();
          tell();
          return;
        case 'committed': {
          const text = reading.text.trim();
          if (text !== '') settled.push(text);
          pending = '';
          tell();
          if (committed) end();
          return;
        }
        case 'silence':
          // Only an answer to the last phrase: a quiet start to a hold is still listened to.
          if (committed) end();
          return;
        case 'error':
          return fail();
        case 'ignore':
          return;
      }
    };
    live.onerror = fail;
    live.onclose = fail;
    after(OPEN_TIMEOUT_MS, () => {
      if (!opened) fail();
    });
    after(MAX_SESSION_MS, end);
  }

  return {
    send: (chunk) => {
      if (done || committed) return;
      if (opened && socket !== null) socket.send(audioMessage(chunk));
      else if (held.length < MAX_HELD_CHUNKS) held.push(chunk);
    },
    finish: () => {
      if (done || finishing) return;
      finishing = true;
      // Before the socket opens, the commit follows the held audio.
      if (opened) commit();
    },
    abort: () => {
      if (!done) close();
    },
  };
}
