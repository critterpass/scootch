/**
 * "Say it": hold to talk, or type. A pure state machine; the hook in `use-composer.ts` feeds it the
 * finger, the phone's hearing and the store, and does what it asks.
 *
 * - Holding starts hearing at once when the microphone is already allowed. The first hold asks
 *   for it instead; letting go before the answer is just a tap.
 * - Words appear as they are heard. Letting go stops hearing; the last words arrive after that,
 *   and only then is anything decided.
 * - A tap too short to be speech, or a hold with nothing heard, gets one line and nothing else.
 * - A refused microphone, or a phone that cannot hear this language on the phone itself, opens
 *   typing with what was heard so far. Typing is always there.
 * - Handing in shows the words first; if the board could not take them, they come back to the
 *   field, never lost.
 * Nothing here waits on the network.
 */

/** A hold shorter than this is a tap, whatever was heard. */
export const SHORT_TAP_MS = 400;
/** After letting go, how long the last words may take before deciding with what came. */
export const LAST_WORDS_MS = 1500;

/** Why the composer is showing a note under it. */
export type ComposerNote = 'short tap' | 'mic off' | 'no hearing' | 'kept';

export type ComposerState =
  | { readonly mode: 'idle'; readonly note: ComposerNote | null }
  /** The first hold: the microphone is being asked for. */
  | { readonly mode: 'asking'; readonly since: number; readonly held: boolean }
  | { readonly mode: 'listening'; readonly since: number; readonly words: string }
  /** Let go: hearing was told to stop, and the last words may still come. */
  | {
      readonly mode: 'stopping';
      readonly since: number;
      readonly releasedAt: number;
      readonly words: string;
    }
  | { readonly mode: 'typing'; readonly draft: string; readonly note: ComposerNote | null }
  /** The words, shown, on their way to the board. */
  | { readonly mode: 'handing'; readonly text: string; readonly from: 'voice' | 'typing' };

export type Permission = 'granted' | 'denied' | 'unknown';

export type ComposerEvent =
  | { readonly type: 'press'; readonly at: number; readonly permission: Permission }
  | { readonly type: 'permission'; readonly granted: boolean }
  | { readonly type: 'heard'; readonly words: string }
  | { readonly type: 'release'; readonly at: number }
  /** Hearing has ended: the phone sent its last words, or `LAST_WORDS_MS` passed. */
  | { readonly type: 'ended' }
  /** The phone cannot hear here (no on-device model for the language, or an error). */
  | { readonly type: 'unavailable' }
  | { readonly type: 'type' }
  | { readonly type: 'edit'; readonly draft: string }
  | { readonly type: 'submit' }
  | { readonly type: 'cancel' }
  | { readonly type: 'handed'; readonly ok: boolean };

/** What the hook must do after a step. */
export type ComposerCommand =
  | { readonly kind: 'ask permission' }
  | { readonly kind: 'start hearing' }
  | { readonly kind: 'stop hearing' }
  | { readonly kind: 'abort hearing' }
  | { readonly kind: 'hand in'; readonly text: string }
  | { readonly kind: 'say'; readonly moment: 'shortTap' };

export interface Step {
  readonly state: ComposerState;
  readonly commands: readonly ComposerCommand[];
}

export const initialComposer: ComposerState = { mode: 'idle', note: null };

const stay = (state: ComposerState): Step => ({ state, commands: [] });

/** Words as a person would see them: one space between, none at the ends. */
export function tidyWords(words: string): string {
  return words.replace(/\s+/g, ' ').trim();
}

function decide(since: number, releasedAt: number, words: string): Step {
  const text = tidyWords(words);
  if (releasedAt - since < SHORT_TAP_MS || text === '') {
    return {
      state: { mode: 'idle', note: 'short tap' },
      commands: [{ kind: 'say', moment: 'shortTap' }],
    };
  }
  return {
    state: { mode: 'handing', text, from: 'voice' },
    commands: [{ kind: 'hand in', text }],
  };
}

export function step(state: ComposerState, event: ComposerEvent): Step {
  switch (event.type) {
    case 'press': {
      if (state.mode !== 'idle') return stay(state);
      if (event.permission === 'denied') {
        return stay({ mode: 'typing', draft: '', note: 'mic off' });
      }
      if (event.permission === 'unknown') {
        return {
          state: { mode: 'asking', since: event.at, held: true },
          commands: [{ kind: 'ask permission' }],
        };
      }
      return {
        state: { mode: 'listening', since: event.at, words: '' },
        commands: [{ kind: 'start hearing' }],
      };
    }
    case 'permission': {
      if (state.mode !== 'asking') return stay(state);
      if (!event.granted) return stay({ mode: 'typing', draft: '', note: 'mic off' });
      // Let go while the system asked: that was the asking, not a hold. The next hold hears.
      if (!state.held) return stay({ mode: 'idle', note: null });
      return {
        state: { mode: 'listening', since: state.since, words: '' },
        commands: [{ kind: 'start hearing' }],
      };
    }
    case 'heard': {
      if (state.mode === 'listening' || state.mode === 'stopping') {
        return stay({ ...state, words: event.words });
      }
      return stay(state);
    }
    case 'release': {
      if (state.mode === 'asking') return stay({ ...state, held: false });
      if (state.mode !== 'listening') return stay(state);
      return {
        state: { mode: 'stopping', since: state.since, releasedAt: event.at, words: state.words },
        commands: [{ kind: 'stop hearing' }],
      };
    }
    case 'ended': {
      if (state.mode === 'stopping') return decide(state.since, state.releasedAt, state.words);
      // Hearing stopped by itself while still held (silence, a call): what was heard stays.
      if (state.mode === 'listening') {
        const draft = tidyWords(state.words);
        return stay(
          draft === '' ? { mode: 'idle', note: null } : { mode: 'typing', draft, note: null },
        );
      }
      return stay(state);
    }
    case 'unavailable': {
      if (state.mode === 'listening' || state.mode === 'stopping' || state.mode === 'asking') {
        const words = state.mode === 'asking' ? '' : tidyWords(state.words);
        return {
          state: { mode: 'typing', draft: words, note: 'no hearing' },
          commands: [{ kind: 'abort hearing' }],
        };
      }
      return stay(state);
    }
    case 'type': {
      if (state.mode === 'idle') return stay({ mode: 'typing', draft: '', note: null });
      return stay(state);
    }
    case 'edit': {
      if (state.mode !== 'typing') return stay(state);
      return stay({
        ...state,
        draft: event.draft,
        note: state.note === 'kept' ? null : state.note,
      });
    }
    case 'submit': {
      if (state.mode !== 'typing') return stay(state);
      const text = tidyWords(state.draft);
      if (text === '') return stay({ mode: 'idle', note: null });
      return {
        state: { mode: 'handing', text, from: 'typing' },
        commands: [{ kind: 'hand in', text }],
      };
    }
    case 'cancel': {
      if (state.mode === 'listening' || state.mode === 'stopping') {
        return { state: { mode: 'idle', note: null }, commands: [{ kind: 'abort hearing' }] };
      }
      if (state.mode === 'typing' || state.mode === 'idle') {
        return stay({ mode: 'idle', note: null });
      }
      return stay(state);
    }
    case 'handed': {
      if (state.mode !== 'handing') return stay(state);
      if (event.ok) return stay({ mode: 'idle', note: null });
      return stay({ mode: 'typing', draft: state.text, note: 'kept' });
    }
  }
}
