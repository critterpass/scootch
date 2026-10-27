import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { HearingTokenResponse } from '@phusclass/domain';

import {
  FINISH_TIMEOUT_MS,
  OPEN_TIMEOUT_MS,
  openHearingSession,
  type Heard,
  type SocketLike,
} from './hearing-session';
import { recordedEnglish, recordedVietnamese } from './scribe-recorded';

const token: HearingTokenResponse = {
  token: 'sutkn_recorded',
  expiresAt: '2026-10-27T09:15:00.000Z',
  url: 'wss://api.elevenlabs.io/v1/speech-to-text/realtime',
  params: { model_id: 'scribe_v2_realtime', audio_format: 'pcm_16000', commit_strategy: 'vad' },
};

/** Scribe's socket at the network boundary: what was sent, and the means to answer. */
class RecordedSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 0;
  readonly sent: Record<string, unknown>[] = [];
  closed = false;

  constructor(readonly url: string) {}

  send(data: string) {
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  say(messages: readonly string[]) {
    for (const data of messages) this.onmessage?.({ data });
  }
  get audio() {
    return this.sent.filter((one) => one['commit'] === false).map((one) => one['audio_base_64']);
  }
  get commits() {
    return this.sent.filter((one) => one['commit'] === true).length;
  }
}

function session() {
  let socket: RecordedSocket | null = null;
  const heard: Heard[] = [];
  const outcome = { ended: 0, failed: 0 };
  const hearing = openHearingSession({
    token,
    open: (url) => (socket = new RecordedSocket(url)),
    events: {
      heard: (one) => heard.push(one),
      ended: () => (outcome.ended += 1),
      failed: () => (outcome.failed += 1),
    },
  });
  if (socket === null) throw new Error('no socket opened');
  return { hearing, socket: socket as RecordedSocket, heard, outcome };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('a hold streamed to Scribe', () => {
  it('opens the socket with the token and names no language', () => {
    const { socket } = session();
    const url = new URL(socket.url);
    expect(url.origin + url.pathname).toBe(token.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({ ...token.params, token: token.token });
  });

  it('keeps the audio said before the socket opened, and sends it first, in order', () => {
    const { hearing, socket } = session();
    hearing.send('first');
    hearing.send('second');
    expect(socket.sent).toEqual([]);

    socket.open();
    hearing.send('third');

    expect(socket.audio).toEqual(['first', 'second', 'third']);
    expect(socket.sent[0]).toEqual({
      message_type: 'input_audio_chunk',
      audio_base_64: 'first',
      commit: false,
      sample_rate: 16000,
    });
  });

  it('shows the guesses as they grow, then the settled words once let go', () => {
    const { hearing, socket, heard, outcome } = session();
    socket.open();
    socket.say(recordedEnglish.beforeCommit);

    expect(heard.at(-1)).toEqual({
      words: "Email the dentist to move Thursday's appointment and call the bank before-",
      pending: "Email the dentist to move Thursday's appointment and call the bank before-",
    });

    hearing.finish();
    expect(socket.commits).toBe(1);
    // Audio after letting go is not sent: the phrase is being settled.
    hearing.send('late');
    expect(socket.audio).toEqual([]);

    socket.say(recordedEnglish.afterCommit);
    expect(heard.at(-1)).toEqual({
      words: "Email the dentist to move Thursday's appointment and call the bank before Friday.",
      pending: '',
    });
    expect(outcome).toEqual({ ended: 1, failed: 0 });
    expect(socket.closed).toBe(true);
  });

  it('keeps a phrase settled during a pause, and ends on the empty commit after it', () => {
    const { hearing, socket, heard, outcome } = session();
    socket.open();
    socket.say(recordedVietnamese.beforeCommit);
    hearing.finish();
    socket.say(recordedVietnamese.afterCommit);

    expect(heard.at(-1)).toEqual({
      words: 'Gọi điện cho mẹ tối nay và nộp báo cáo tài chính trước thứ Sáu.',
      pending: '',
    });
    expect(outcome).toEqual({ ended: 1, failed: 0 });
  });

  it('sends the commit after the held audio when let go before the socket opened', () => {
    const { hearing, socket } = session();
    hearing.send('said quickly');
    hearing.finish();
    expect(socket.sent).toEqual([]);

    socket.open();

    expect(socket.audio).toEqual(['said quickly']);
    expect(socket.sent.at(-1)).toMatchObject({ commit: true, audio_base_64: '' });
  });

  it('ends with what it heard when the last phrase never settles', () => {
    const { hearing, socket, heard, outcome } = session();
    socket.open();
    socket.say(recordedEnglish.beforeCommit);
    hearing.finish();

    jest.advanceTimersByTime(FINISH_TIMEOUT_MS);

    expect(outcome).toEqual({ ended: 1, failed: 0 });
    expect(heard.at(-1)?.words).toContain('call the bank');
  });
});

describe('a connection that fails', () => {
  it('reports failed when the socket never opens and nothing was heard', () => {
    const { hearing, outcome } = session();
    hearing.send('words nobody heard');

    jest.advanceTimersByTime(OPEN_TIMEOUT_MS);

    expect(outcome).toEqual({ ended: 0, failed: 1 });
  });

  it('reports failed when Scribe refuses the session before any words', () => {
    const { socket, outcome } = session();
    socket.open();
    socket.say([JSON.stringify({ message_type: 'auth_error', error: 'recorded' })]);

    expect(outcome).toEqual({ ended: 0, failed: 1 });
    expect(socket.closed).toBe(true);
  });

  it('ends with the words already heard when the socket drops mid-phrase', () => {
    const { socket, heard, outcome } = session();
    socket.open();
    socket.say(recordedEnglish.beforeCommit.slice(0, 3));
    socket.onclose?.();

    expect(outcome).toEqual({ ended: 1, failed: 0 });
    expect(heard.at(-1)?.words).toBe('Email the dentist to move Thursday.');
  });

  it('says nothing more once aborted', () => {
    const { hearing, socket, outcome } = session();
    socket.open();
    hearing.abort();
    socket.say(recordedEnglish.afterCommit);
    jest.advanceTimersByTime(OPEN_TIMEOUT_MS + FINISH_TIMEOUT_MS);

    expect(outcome).toEqual({ ended: 0, failed: 0 });
    expect(socket.closed).toBe(true);
  });
});
