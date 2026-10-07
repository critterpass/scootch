import type { SocketLike } from '../../api/table-socket';
import type { Timers } from '../../effects/adapters';

/** Where ElevenLabs listens. No language is named, so it works out the language by itself. */
const SCRIBE_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const SCRIBE_MODEL = 'scribe_v2_realtime';
/** The sample rates ElevenLabs takes raw 16-bit sound in. */
const SCRIBE_RATES: readonly number[] = [8000, 16000, 22050, 24000, 44100, 48000];

/** The line must be open this soon after the recording starts, or the phone listens instead. */
export const CONNECT_MS = 4000;
/** How long the last words are waited for once the person has let go. */
export const FINISH_MS = 2000;

const BYTES_PER_SAMPLE = 2;
/** Sound is sent in pieces of about this long: short enough to feel live. */
const PIECE_SECONDS = 0.1;
/** Sound that queued up while the line was opening goes in pieces no longer than this. */
const LONGEST_PIECE_SECONDS = 1;

export function scribeTakes(sampleRate: number): boolean {
  return SCRIBE_RATES.includes(sampleRate);
}

export function scribeUrl(token: string, sampleRate: number): string {
  const query = [
    `model_id=${SCRIBE_MODEL}`,
    `audio_format=pcm_${sampleRate}`,
    'commit_strategy=manual',
    `token=${encodeURIComponent(token)}`,
  ];
  return `${SCRIBE_URL}?${query.join('&')}`;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64FromBytes(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    out += BASE64.charAt(a >> 2) + BASE64.charAt(((a & 3) << 4) | (b >> 4));
    out += i + 1 < bytes.length ? BASE64.charAt(((b & 15) << 2) | (c >> 6)) : '=';
    out += i + 2 < bytes.length ? BASE64.charAt(c & 63) : '=';
  }
  return out;
}

/** How loud a buffer of 16-bit sound is, from 0 (silence) to 1 (a raised voice). */
export function levelFromPcm16(data: ArrayBuffer): number {
  const samples = new Int16Array(data, 0, Math.floor(data.byteLength / BYTES_PER_SAMPLE));
  if (samples.length === 0) return 0;
  let squares = 0;
  for (const sample of samples) squares += sample * sample;
  const rms = Math.sqrt(squares / samples.length) / 32768;
  if (rms === 0) return 0;
  // A quiet room sits near -50 dB and a raised voice near -10 dB.
  return Math.max(0, Math.min(1, (20 * Math.log10(rms) + 50) / 40));
}

export interface ScribeHandlers {
  /** Everything heard so far in this recording. */
  onHeard(transcript: string): void;
  /** The recording was finished and these are its words. */
  onEnd(transcript: string): void;
  /** The line failed while the person was still talking. `heard` is what had arrived by then. */
  onFail(heard: string): void;
}

export interface ScribeOptions {
  /** The single-use pass from the API. */
  readonly token: Promise<string>;
  /** The rate of the 16-bit mono sound that will be pushed. */
  readonly sampleRate: number;
  readonly open: (url: string) => SocketLike;
  readonly timers: Timers;
  readonly handlers: ScribeHandlers;
}

export interface ScribeSession {
  /** More sound from the microphone: 16-bit, mono, at the session's rate. */
  push(data: ArrayBuffer): void;
  /** The person let go: the last words are asked for and delivered through `onEnd`. */
  finish(): void;
  /** Ends the session and throws its words away. */
  abort(): void;
}

/**
 * One live transcription with ElevenLabs. Sound pushed before the line is open is kept and sent
 * the moment it opens, so the first words are never lost to the connection. Words arrive as they
 * are heard; the provider settles them in segments, and the last segment is settled on `finish`.
 *
 * Nothing heard is ever logged: the words are the person's own.
 */
export function openScribe(options: ScribeOptions): ScribeSession {
  const { sampleRate, handlers, timers } = options;
  const pieceBytes = Math.round(sampleRate * PIECE_SECONDS) * BYTES_PER_SAMPLE;
  const longestBytes = Math.round(sampleRate * LONGEST_PIECE_SECONDS) * BYTES_PER_SAMPLE;

  let phase: 'connecting' | 'open' | 'over' = 'connecting';
  let finishing = false;
  let socket: SocketLike | null = null;
  let waiting: Uint8Array[] = [];
  let waitingBytes = 0;
  const settled: string[] = [];
  let unsettled = '';
  let cancelTimer = timers.set(CONNECT_MS, () => fail());

  const heard = () => [...settled, unsettled].filter((part) => part !== '').join(' ');

  const close = () => {
    phase = 'over';
    cancelTimer();
    waiting = [];
    waitingBytes = 0;
    if (socket === null) return;
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
    try {
      socket.close();
    } catch {
      // Already closed.
    }
    socket = null;
  };

  const end = () => {
    if (phase === 'over') return;
    close();
    handlers.onEnd(heard());
  };

  /** A failure after the person let go still ends the recording with whatever had arrived. */
  const fail = () => {
    if (phase === 'over') return;
    if (finishing) return end();
    close();
    handlers.onFail(heard());
  };

  const sendPiece = (bytes: Uint8Array, commit: boolean) => {
    socket?.send(
      JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: base64FromBytes(bytes),
        commit,
        sample_rate: sampleRate,
      }),
    );
  };

  /** Sends what is waiting. `everything` also sends a last piece shorter than a full one. */
  const flush = (everything: boolean) => {
    if (phase !== 'open' || (!everything && waitingBytes < pieceBytes)) return;
    const all = new Uint8Array(waitingBytes);
    let at = 0;
    for (const part of waiting) {
      all.set(part, at);
      at += part.length;
    }
    waiting = [];
    waitingBytes = 0;
    for (let from = 0; from < all.length; from += longestBytes) {
      sendPiece(all.subarray(from, Math.min(all.length, from + longestBytes)), false);
    }
  };

  const askForLastWords = () => {
    flush(true);
    // The segment is settled with a moment of silence, so the last word is not cut short.
    sendPiece(new Uint8Array(pieceBytes), true);
    cancelTimer();
    cancelTimer = timers.set(FINISH_MS, end);
  };

  const onMessage = (data: unknown) => {
    if (typeof data !== 'string') return;
    let message: { message_type?: unknown; text?: unknown; error?: unknown };
    try {
      message = JSON.parse(data) as typeof message;
    } catch {
      return;
    }
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    switch (message.message_type) {
      case 'session_started':
        return;
      case 'partial_transcript':
        unsettled = text;
        return handlers.onHeard(heard());
      case 'committed_transcript':
        if (text !== '') settled.push(text);
        unsettled = '';
        handlers.onHeard(heard());
        if (finishing) end();
        return;
      default:
        // Each of the provider's errors carries an `error`; anything else is not for this phone.
        if (message.error !== undefined) fail();
    }
  };

  void options.token.then(
    (token) => {
      if (phase === 'over') return;
      try {
        socket = options.open(scribeUrl(token, sampleRate));
      } catch {
        return fail();
      }
      socket.onopen = () => {
        if (phase !== 'connecting') return;
        phase = 'open';
        cancelTimer();
        if (finishing) askForLastWords();
        else flush(true);
      };
      socket.onmessage = (event) => onMessage(event.data);
      socket.onerror = () => fail();
      socket.onclose = () => fail();
    },
    () => fail(),
  );

  return {
    push(data) {
      if (phase === 'over' || finishing) return;
      waiting.push(new Uint8Array(data.slice(0)));
      waitingBytes += data.byteLength;
      flush(false);
    },
    finish() {
      if (phase === 'over' || finishing) return;
      finishing = true;
      // Still connecting: the wait for the line stands, and the last words are asked for on open.
      if (phase === 'open') askForLastWords();
    },
    abort: close,
  };
}
