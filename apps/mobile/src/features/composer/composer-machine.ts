/**
 * Whether the phone can listen: `ready` (allowed and able), `unasked` (the system has not asked
 * yet), `refused` (the person said no to the microphone or to speech recognition) or
 * `unavailable` (the phone cannot transcribe this language by itself).
 */
export type VoiceStatus = 'ready' | 'unasked' | 'refused' | 'unavailable';

export type ComposerNotice = 'cancelled' | 'too_short' | 'empty';

export interface ComposerState {
  readonly mode: 'voice' | 'typing';
  /** `finishing`: let go, waiting for the last words. `sending`: handed to the day store. */
  readonly phase: 'idle' | 'listening' | 'finishing' | 'sending';
  /** The finger has slid far enough left that letting go cancels. */
  readonly armed: boolean;
  readonly voice: VoiceStatus;
  /** What is in the text field. */
  readonly text: string;
  /** What has been heard so far in this recording. */
  readonly transcript: string;
  readonly startedAt: number | null;
  readonly notice: ComposerNotice | null;
}

export type ComposerEvent =
  | { readonly type: 'voice_status'; readonly status: VoiceStatus }
  | { readonly type: 'hold_started'; readonly at: number }
  /** `dx` is how far the finger is from where it went down; left is negative. */
  | { readonly type: 'slid'; readonly dx: number }
  | { readonly type: 'released'; readonly at: number }
  /** The alternative to holding, for a screen reader: one tap starts and the next one sends. */
  | { readonly type: 'toggled'; readonly at: number }
  | { readonly type: 'cancel_tapped' }
  | { readonly type: 'heard'; readonly transcript: string }
  | { readonly type: 'recognition_ended'; readonly transcript: string }
  | { readonly type: 'recognition_failed'; readonly reason: 'refused' | 'unavailable' | 'nothing' }
  | { readonly type: 'keyboard_tapped' }
  | { readonly type: 'voice_tapped' }
  | { readonly type: 'text_changed'; readonly text: string }
  | { readonly type: 'send_tapped' }
  | { readonly type: 'sent' }
  /** The day store handed the sent words back (the wait was cancelled): they are in the field again. */
  | { readonly type: 'text_returned'; readonly text: string }
  | { readonly type: 'notice_cleared' };

export type ComposerEffect =
  /** Show the system's microphone and speech prompts, then report the status. */
  | { readonly kind: 'ask_to_listen' }
  | { readonly kind: 'start_listening' }
  /** Stop and deliver what was heard. */
  | { readonly kind: 'stop_listening' }
  /** Stop and throw away what was heard. */
  | { readonly kind: 'abort_listening' }
  | { readonly kind: 'send'; readonly text: string; readonly source: 'ramble' | 'typed' }
  | { readonly kind: 'tick' };

export interface ComposerStep {
  readonly state: ComposerState;
  readonly effects: readonly ComposerEffect[];
}

/** Sliding this far left arms the cancel, as in the design. */
export const CANCEL_SLIDE = -80;
/** A hold shorter than this was a tap, not a recording. */
export const SHORTEST_HOLD_MS = 450;

export function initialComposer(voice: VoiceStatus = 'unasked'): ComposerState {
  return {
    mode: canListen(voice) ? 'voice' : 'typing',
    phase: 'idle',
    armed: false,
    voice,
    text: '',
    transcript: '',
    startedAt: null,
    notice: null,
  };
}

function canListen(voice: VoiceStatus): boolean {
  return voice === 'ready' || voice === 'unasked';
}

const stay = (state: ComposerState): ComposerStep => ({ state, effects: [] });
const RESTING = { phase: 'idle', armed: false, transcript: '', startedAt: null } as const;

function startListening(state: ComposerState, at: number): ComposerStep {
  if (state.mode !== 'voice' || state.phase !== 'idle') return stay(state);
  if (state.voice === 'unasked') {
    return { state: { ...state, notice: null }, effects: [{ kind: 'ask_to_listen' }] };
  }
  if (state.voice !== 'ready') return stay({ ...state, mode: 'typing' });
  return {
    state: { ...state, ...RESTING, phase: 'listening', startedAt: at, notice: null },
    effects: [{ kind: 'tick' }, { kind: 'start_listening' }],
  };
}

function cancel(state: ComposerState, notice: ComposerNotice): ComposerStep {
  return { state: { ...state, ...RESTING, notice }, effects: [{ kind: 'abort_listening' }] };
}

/** The recording is over: its words are sent, or there were none and nothing is. */
function finish(state: ComposerState, transcript: string): ComposerStep {
  const text = (transcript.trim() || state.transcript).trim();
  if (text === '') return stay({ ...state, ...RESTING, notice: 'empty' });
  return {
    state: { ...state, ...RESTING, phase: 'sending', notice: null },
    effects: [{ kind: 'send', text, source: 'ramble' }],
  };
}

/**
 * The composer as a state machine: hold to talk, slide left to cancel, let go to send; or type and
 * send. It performs nothing itself: the effects say what the phone and the day store must do.
 */
export function composerReducer(state: ComposerState, event: ComposerEvent): ComposerStep {
  const recording = state.phase === 'listening' || state.phase === 'finishing';
  switch (event.type) {
    case 'voice_status': {
      const next = { ...state, voice: event.status };
      if (canListen(event.status)) return stay(next);
      // Without a microphone the composer is a text field, and it keeps working as one.
      const typing = { ...next, mode: 'typing' as const };
      return recording
        ? { state: { ...typing, ...RESTING }, effects: [{ kind: 'abort_listening' }] }
        : stay(typing);
    }
    case 'hold_started':
      return startListening(state, event.at);
    case 'slid':
      if (state.phase !== 'listening') return stay(state);
      return stay({ ...state, armed: event.dx < CANCEL_SLIDE });
    case 'released': {
      if (state.phase !== 'listening') return stay(state);
      if (state.armed) return cancel(state, 'cancelled');
      if (event.at - (state.startedAt ?? event.at) < SHORTEST_HOLD_MS) {
        return cancel(state, 'too_short');
      }
      return {
        state: { ...state, phase: 'finishing' },
        effects: [{ kind: 'stop_listening' }],
      };
    }
    case 'toggled':
      if (state.phase === 'listening') {
        return { state: { ...state, phase: 'finishing' }, effects: [{ kind: 'stop_listening' }] };
      }
      return startListening(state, event.at);
    case 'cancel_tapped':
      return state.phase === 'listening' ? cancel(state, 'cancelled') : stay(state);
    case 'heard':
      return recording ? stay({ ...state, transcript: event.transcript }) : stay(state);
    case 'recognition_ended':
      // After a cancel the recogniser still reports its end: there is nothing left to send.
      return recording ? finish(state, event.transcript) : stay(state);
    case 'recognition_failed': {
      if (event.reason === 'nothing') {
        return recording ? stay({ ...state, ...RESTING, notice: 'empty' }) : stay(state);
      }
      return stay({ ...state, ...RESTING, voice: event.reason, mode: 'typing' });
    }
    case 'keyboard_tapped':
      return state.phase === 'idle'
        ? stay({ ...state, mode: 'typing', notice: null })
        : stay(state);
    case 'voice_tapped':
      return state.phase === 'idle' && canListen(state.voice)
        ? stay({ ...state, mode: 'voice', notice: null })
        : stay(state);
    case 'text_changed':
      return stay({ ...state, text: event.text, notice: null });
    case 'send_tapped': {
      const text = state.text.trim();
      if (state.mode !== 'typing' || state.phase !== 'idle' || text === '') return stay(state);
      return {
        state: { ...state, phase: 'sending', text: '', notice: null },
        effects: [{ kind: 'send', text, source: 'typed' }],
      };
    }
    case 'sent':
      return state.phase === 'sending' ? stay({ ...state, phase: 'idle' }) : stay(state);
    case 'text_returned':
      // Spoken or typed, the words come back as text to edit or send again.
      return recording
        ? stay(state)
        : stay({ ...state, ...RESTING, mode: 'typing', text: event.text, notice: null });
    case 'notice_cleared':
      return stay({ ...state, notice: null });
  }
}
