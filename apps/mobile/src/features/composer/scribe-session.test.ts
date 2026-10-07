import { describe, expect, it } from '@jest/globals';

import type { SocketLike } from '../../api/table-socket';

import {
  CONNECT_MS,
  FINISH_MS,
  base64FromBytes,
  levelFromPcm16,
  openScribe,
  scribeTakes,
} from './scribe-session';

const RATE = 16000;
/** A tenth of a second of 16-bit sound: the size of one piece on the wire. */
const PIECE = (RATE / 10) * 2;

interface Chunk {
  readonly bytes: number;
  readonly commit: boolean;
  readonly sample_rate: number;
}

/** ElevenLabs' end of the line: keeps what it was sent and says what the test tells it to. */
function line() {
  const urls: string[] = [];
  const chunks: Chunk[] = [];
  let closed = false;
  const socket: SocketLike = {
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    send(data) {
      const message = JSON.parse(data) as {
        message_type: string;
        audio_base_64: string;
        commit: boolean;
        sample_rate: number;
      };
      expect(message.message_type).toBe('input_audio_chunk');
      chunks.push({
        bytes: Buffer.from(message.audio_base_64, 'base64').length,
        commit: message.commit,
        sample_rate: message.sample_rate,
      });
    },
    close() {
      closed = true;
    },
  };
  return {
    urls,
    chunks,
    isClosed: () => closed,
    open: (url: string) => {
      urls.push(url);
      return socket;
    },
    connected: () => socket.onopen?.(),
    says: (message: object) => socket.onmessage?.({ data: JSON.stringify(message) }),
    drops: () => socket.onclose?.({}),
  };
}

function clock() {
  const pending: { at: number; fire: () => void }[] = [];
  let now = 0;
  return {
    timers: {
      set(delayMs: number, fire: () => void) {
        const entry = { at: now + delayMs, fire };
        pending.push(entry);
        return () => {
          const index = pending.indexOf(entry);
          if (index >= 0) pending.splice(index, 1);
        };
      },
    },
    pass(ms: number) {
      now += ms;
      for (const entry of pending.filter((each) => each.at <= now)) {
        pending.splice(pending.indexOf(entry), 1);
        entry.fire();
      }
    },
  };
}

function session(token: Promise<string> = Promise.resolve('sutkn_once')) {
  const wire = line();
  const time = clock();
  const events: string[] = [];
  const scribe = openScribe({
    token,
    sampleRate: RATE,
    open: wire.open,
    timers: time.timers,
    handlers: {
      onHeard: (transcript) => events.push(`heard:${transcript}`),
      onEnd: (transcript) => events.push(`end:${transcript}`),
      onFail: (heard) => events.push(`fail:${heard}`),
    },
  });
  return { wire, time, events, scribe };
}

const sound = (bytes: number) => new ArrayBuffer(bytes);
/** Lets the token promise settle. */
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('a live transcription with ElevenLabs', () => {
  it('opens with the single-use pass, the sound format and no language, so the language is detected', async () => {
    const { wire } = session();
    await settle();

    expect(wire.urls).toHaveLength(1);
    const url = new URL(wire.urls[0] ?? '');
    expect(`${url.origin}${url.pathname}`).toBe(
      'wss://api.elevenlabs.io/v1/speech-to-text/realtime',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      model_id: 'scribe_v2_realtime',
      audio_format: 'pcm_16000',
      commit_strategy: 'manual',
      token: 'sutkn_once',
    });
  });

  it('keeps the sound spoken while the line opens and sends all of it once it has', async () => {
    const { wire, scribe } = session();
    scribe.push(sound(PIECE));
    scribe.push(sound(PIECE * 14));
    await settle();
    expect(wire.chunks).toEqual([]);

    wire.connected();

    // A second and a half had queued: it goes in pieces of at most a second, nothing settled.
    expect(wire.chunks).toEqual([
      { bytes: PIECE * 10, commit: false, sample_rate: RATE },
      { bytes: PIECE * 5, commit: false, sample_rate: RATE },
    ]);
  });

  it('sends live sound in pieces of a tenth of a second', async () => {
    const { wire, scribe } = session();
    await settle();
    wire.connected();

    scribe.push(sound(PIECE / 2));
    expect(wire.chunks).toEqual([]);
    scribe.push(sound(PIECE / 2));

    expect(wire.chunks).toEqual([{ bytes: PIECE, commit: false, sample_rate: RATE }]);
  });

  it('reports the words as they come: settled segments, then whatever is still being heard', async () => {
    const { wire, events } = session();
    await settle();
    wire.connected();

    wire.says({ message_type: 'session_started', session_id: 's1', config: {} });
    wire.says({ message_type: 'partial_transcript', text: 'gọi' });
    wire.says({ message_type: 'partial_transcript', text: 'gọi nha sĩ' });
    wire.says({ message_type: 'committed_transcript', text: 'Gọi nha sĩ.' });
    wire.says({ message_type: 'partial_transcript', text: 'then email Sam' });

    expect(events).toEqual([
      'heard:gọi',
      'heard:gọi nha sĩ',
      'heard:Gọi nha sĩ.',
      'heard:Gọi nha sĩ. then email Sam',
    ]);
  });

  it('settles the last words when the person lets go, and ends with everything heard', async () => {
    const { wire, events, scribe } = session();
    await settle();
    wire.connected();
    scribe.push(sound(PIECE / 2));
    wire.says({ message_type: 'partial_transcript', text: 'call the dent' });

    scribe.finish();

    // What was still waiting goes first; then a moment of silence asks for the segment to settle.
    expect(wire.chunks).toEqual([
      { bytes: PIECE / 2, commit: false, sample_rate: RATE },
      { bytes: PIECE, commit: true, sample_rate: RATE },
    ]);
    expect(events).toEqual(['heard:call the dent']);

    wire.says({ message_type: 'committed_transcript', text: 'Call the dentist.' });

    expect(events.at(-1)).toBe('end:Call the dentist.');
    expect(wire.isClosed()).toBe(true);
    // Sound after the end goes nowhere.
    scribe.push(sound(PIECE));
    expect(wire.chunks).toHaveLength(2);
  });

  it('ends with what it has when the last words never settle', async () => {
    const { wire, time, events, scribe } = session();
    await settle();
    wire.connected();
    wire.says({ message_type: 'partial_transcript', text: 'water the plants' });

    scribe.finish();
    time.pass(FINISH_MS);

    expect(events.at(-1)).toBe('end:water the plants');
  });

  it('ends with what it has when the provider answers the last words with an error', async () => {
    const { wire, events, scribe } = session();
    await settle();
    wire.connected();
    wire.says({ message_type: 'committed_transcript', text: 'Pay rent.' });

    scribe.finish();
    wire.says({ message_type: 'insufficient_audio_activity', error: 'no speech' });

    expect(events.at(-1)).toBe('end:Pay rent.');
  });

  it('asks for the last words as soon as the line opens, when the person let go before it had', async () => {
    const { wire, events, scribe } = session();
    scribe.push(sound(PIECE * 3));
    scribe.finish();
    await settle();

    wire.connected();
    wire.says({ message_type: 'committed_transcript', text: 'Buy milk.' });

    expect(wire.chunks).toEqual([
      { bytes: PIECE * 3, commit: false, sample_rate: RATE },
      { bytes: PIECE, commit: true, sample_rate: RATE },
    ]);
    expect(events).toEqual(['heard:Buy milk.', 'end:Buy milk.']);
  });

  it('fails, with nothing heard, when no pass can be had', async () => {
    const { wire, events } = session(Promise.reject(new Error('offline')));
    await settle();

    expect(wire.urls).toEqual([]);
    expect(events).toEqual(['fail:']);
  });

  it('fails when the line does not open in time', async () => {
    const { wire, time, events } = session();
    await settle();

    time.pass(CONNECT_MS);

    expect(events).toEqual(['fail:']);
    expect(wire.isClosed()).toBe(true);
  });

  it('fails with the words that had arrived when the line drops or the provider reports an error', async () => {
    const dropped = session();
    await settle();
    dropped.wire.connected();
    dropped.wire.says({ message_type: 'partial_transcript', text: 'ring mum' });
    dropped.wire.drops();
    expect(dropped.events.at(-1)).toBe('fail:ring mum');

    const refused = session();
    await settle();
    refused.wire.connected();
    refused.wire.says({ message_type: 'quota_exceeded', error: 'out of credit' });
    expect(refused.events).toEqual(['fail:']);
  });

  it('says nothing more once it has been thrown away', async () => {
    const { wire, time, events, scribe } = session();
    await settle();
    wire.connected();

    scribe.abort();
    wire.says({ message_type: 'partial_transcript', text: 'never mind' });
    time.pass(CONNECT_MS + FINISH_MS);

    expect(events).toEqual([]);
    expect(wire.isClosed()).toBe(true);
  });
});

describe('sound on its way to ElevenLabs', () => {
  it('is encoded as base64 whatever its length', () => {
    for (const text of ['', 'a', 'ab', 'abc', 'abcd', 'hello, scootch']) {
      const bytes = Uint8Array.from(Buffer.from(text));
      expect(base64FromBytes(bytes)).toBe(Buffer.from(text).toString('base64'));
    }
    expect(base64FromBytes(Uint8Array.of(0, 255, 254, 253))).toBe('AP/+/Q==');
  });

  it('is only sent at a rate ElevenLabs takes', () => {
    expect(scribeTakes(16000)).toBe(true);
    expect(scribeTakes(48000)).toBe(true);
    expect(scribeTakes(32000)).toBe(false);
  });

  it('is measured from silence at 0 to a raised voice at 1', () => {
    expect(levelFromPcm16(new ArrayBuffer(0))).toBe(0);
    expect(levelFromPcm16(new Int16Array(160).buffer)).toBe(0);
    const quiet = levelFromPcm16(new Int16Array(160).fill(300).buffer);
    const loud = levelFromPcm16(new Int16Array(160).fill(6000).buffer);
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(quiet);
    expect(levelFromPcm16(new Int16Array(160).fill(32767).buffer)).toBe(1);
  });
});
