import { describe, expect, it } from '@jest/globals';

import type { HearingTokenResponse } from '@phusclass/domain';

import type { Mic } from '../../../modules/phusclass-mic';
import { ApiClientError } from '../../api/api-error';

import { listen, type HearingFailure } from './hearing-listener';
import type { Heard, SocketLike } from './hearing-session';
import { createTokenSource } from './hearing-token';
import { recordedEnglish } from './scribe-recorded';

const token: HearingTokenResponse = {
  token: 'sutkn_recorded',
  expiresAt: '2026-10-27T09:15:00.000Z',
  url: 'wss://api.elevenlabs.io/v1/speech-to-text/realtime',
  params: { model_id: 'scribe_v2_realtime', audio_format: 'pcm_16000', commit_strategy: 'vad' },
};

/** The microphone's native side: what JavaScript asked of it, and the means to speak into it. */
function microphone({ starts = true } = {}) {
  const listeners = {
    audio: new Set<(chunk: string) => void>(),
    level: new Set<(n: number) => void>(),
  };
  const asked: string[] = [];
  const subscribe = <T>(set: Set<T>, listener: T) => {
    set.add(listener);
    return () => void set.delete(listener);
  };
  const mic: Mic = {
    permission: () => Promise.resolve('granted'),
    ask: () => Promise.resolve(true),
    start: () => {
      asked.push('start');
      return starts ? Promise.resolve() : Promise.reject(new Error('no input'));
    },
    stop: () => {
      asked.push('stop');
      return Promise.resolve();
    },
    onAudio: (listener) => subscribe(listeners.audio, listener),
    onLevel: (listener) => subscribe(listeners.level, listener),
    onStop: () => () => undefined,
  };
  return {
    mic,
    asked,
    speak: (chunk: string, level = 0.7) => {
      for (const listener of listeners.level) listener(level);
      for (const listener of listeners.audio) listener(chunk);
    },
    listening: () => listeners.audio.size,
  };
}

/** Scribe's socket at the network boundary. */
class RecordedSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 0;
  readonly sent: Record<string, unknown>[] = [];
  send(data: string) {
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}

const settle = () => new Promise((done) => setTimeout(done, 0));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function hold(mic: Mic, asked: Promise<HearingTokenResponse>) {
  const sockets: RecordedSocket[] = [];
  const heard: Heard[] = [];
  const levels: number[] = [];
  const outcome: { ended: number; failed: HearingFailure[] } = { ended: 0, failed: [] };
  const listening = listen({
    mic,
    token: () => asked,
    open: () => {
      const socket = new RecordedSocket();
      sockets.push(socket);
      return socket;
    },
    events: {
      heard: (one) => heard.push(one),
      level: (one) => levels.push(one),
      ended: () => (outcome.ended += 1),
      failed: (why) => outcome.failed.push(why),
    },
  });
  return { listening, sockets, heard, levels, outcome };
}

describe('holding to talk', () => {
  it('turns the microphone on at once and keeps what is said while the token comes', async () => {
    const { mic, asked, speak } = microphone();
    const minted = deferred<HearingTokenResponse>();
    const { listening, sockets, levels } = hold(mic, minted.promise);

    expect(asked).toEqual(['start']);
    await settle();
    speak('a');
    speak('b');
    // The voice shows before anything is connected.
    expect(levels).toEqual([0.7, 0.7]);
    expect(sockets).toHaveLength(0);

    minted.resolve(token);
    await settle();
    const socket = sockets[0];
    if (socket === undefined) throw new Error('no socket');
    speak('c');
    socket.open();

    expect(socket.sent.map((one) => one['audio_base_64'])).toEqual(['a', 'b', 'c']);
    listening.abort();
  });

  it('let go before the token came: the held audio is still sent, then settled', async () => {
    const { mic, asked, speak } = microphone();
    const minted = deferred<HearingTokenResponse>();
    const { listening, sockets, heard, outcome } = hold(mic, minted.promise);
    await settle();
    speak('call mom');
    listening.stop();
    await settle();
    expect(asked).toEqual(['start', 'stop']);

    minted.resolve(token);
    await settle();
    const socket = sockets[0];
    if (socket === undefined) throw new Error('no socket');
    socket.open();
    expect(socket.sent.map((one) => one['commit'])).toEqual([false, true]);

    socket.onmessage?.({ data: recordedEnglish.afterCommit[0] });
    await settle();
    expect(heard.at(-1)?.pending).toBe('');
    expect(outcome).toEqual({ ended: 1, failed: [] });
  });
});

describe('when nothing can be heard', () => {
  it('says there is no connection when the token cannot be fetched, with the microphone off', async () => {
    const { mic, asked, listening: subscribed } = microphone();
    const { outcome, levels } = hold(
      mic,
      Promise.reject(new ApiClientError('network', false, null, 'unreachable')),
    );
    await settle();
    await settle();

    expect(outcome.failed).toEqual(['offline']);
    expect(asked).toEqual(['start', 'stop']);
    expect(subscribed()).toBe(0);
    expect(levels.at(-1)).toBe(0);
  });

  it('says hearing is unavailable when the server cannot mint a token', async () => {
    const { mic } = microphone();
    const { outcome } = hold(
      mic,
      Promise.reject(
        new ApiClientError('model_unavailable', true, 503, 'Hearing is not available'),
      ),
    );
    await settle();
    await settle();

    expect(outcome.failed).toEqual(['unavailable']);
  });

  it('says hearing is unavailable when the microphone will not start', async () => {
    const { mic } = microphone({ starts: false });
    const { outcome, sockets } = hold(mic, Promise.resolve(token));
    await settle();
    await settle();

    expect(outcome.failed).toEqual(['unavailable']);
    expect(sockets).toHaveLength(0);
  });
});

describe('the token kept ready', () => {
  it('is spent once, and a fresh one is fetched behind it', async () => {
    let made = 0;
    const tokens = createTokenSource(
      () => Promise.resolve({ ...token, token: `kept-${(made += 1)}` }),
      () => Date.parse('2026-10-27T09:00:00.000Z'),
    );
    tokens.warm();
    expect((await tokens.take()).token).toBe('kept-1');
    expect((await tokens.take()).token).toBe('kept-2');
    expect(made).toBe(2);
  });

  it('is not used once it is about to expire', async () => {
    let now = Date.parse('2026-10-27T09:00:00.000Z');
    let made = 0;
    const tokens = createTokenSource(
      () => Promise.resolve({ ...token, token: `kept-${(made += 1)}` }),
      () => now,
    );
    tokens.warm();
    await settle();
    now = Date.parse('2026-10-27T09:14:30.000Z');

    expect((await tokens.take()).token).toBe('kept-2');
  });
});
