import type { StringKey } from '@scootch/i18n';

type CatchKey = Extract<StringKey, `session.catch.${string}`>;

/** A caption's two lines. While the trap sets, the headline is the task and only `s` is read. */
interface CaptionKeys {
  readonly h?: CatchKey;
  readonly s?: CatchKey;
}

/** Every caption a catch can write, by a short name. */
export const CAPTIONS = {
  waiting: { h: 'session.catch.waiting', s: 'session.catch.waiting.sub' },
  early: { h: 'session.catch.early', s: 'session.catch.early.sub' },

  'jar.setting': { s: 'session.catch.jar.setting.sub' },
  'jar.ready': { h: 'session.catch.jar.ready', s: 'session.catch.jar.ready.sub' },
  'jar.almost': { h: 'session.catch.jar.almost', s: 'session.catch.jar.almost.sub' },
  'jar.under': { h: 'session.catch.jar.under', s: 'session.catch.jar.under.sub' },
  'jar.card': { h: 'session.catch.jar.card', s: 'session.catch.jar.card.sub' },
  'jar.won': { h: 'session.catch.jar.won' },

  'reel.setting': { s: 'session.catch.reel.setting.sub' },
  'reel.noticed': { s: 'session.catch.reel.noticed.sub' },
  'reel.ready': { h: 'session.catch.reel.ready', s: 'session.catch.reel.ready.sub' },
  'reel.winding': { h: 'session.catch.reel.winding', s: 'session.catch.reel.winding.sub' },
  'reel.fighting': { h: 'session.catch.reel.fighting', s: 'session.catch.reel.winding.sub' },
  'reel.oneMore': { h: 'session.catch.reel.oneMore', s: 'session.catch.reel.winding.sub' },
  'reel.stopped': { h: 'session.catch.reel.stopped', s: 'session.catch.reel.stopped.sub' },
  'reel.yank': { h: 'session.catch.reel.yank' },
  'reel.won': { h: 'session.catch.reel.won' },

  'lasso.setting': { s: 'session.catch.lasso.setting.sub' },
  'lasso.flagging': { s: 'session.catch.lasso.flagging.sub' },
  'lasso.ready': { h: 'session.catch.lasso.ready', s: 'session.catch.lasso.ready.sub' },
  'lasso.lively': { h: 'session.catch.lasso.lively', s: 'session.catch.lasso.lively.sub' },
  'lasso.beside': { h: 'session.catch.lasso.missed', s: 'session.catch.lasso.beside.sub' },
  'lasso.open': { h: 'session.catch.lasso.missed', s: 'session.catch.lasso.open.sub' },
  'lasso.cinched': { h: 'session.catch.lasso.cinched', s: 'session.catch.lasso.cinched.sub' },
  'lasso.won': { h: 'session.catch.lasso.won' },

  'sticker.setting': { s: 'session.catch.sticker.setting.sub' },
  'sticker.ready': { h: 'session.catch.sticker.ready', s: 'session.catch.sticker.ready.sub' },
  'sticker.peeled': { h: 'session.catch.sticker.peeled', s: 'session.catch.sticker.peeled.sub' },
  'sticker.notThere': {
    h: 'session.catch.sticker.notThere',
    s: 'session.catch.sticker.notThere.sub',
  },
  'sticker.won': { h: 'session.catch.sticker.won' },

  'bubble.setting': { s: 'session.catch.bubble.setting.sub' },
  'bubble.closing': { s: 'session.catch.bubble.closing.sub' },
  'bubble.ready': { h: 'session.catch.bubble.ready', s: 'session.catch.bubble.ready.sub' },
  'bubble.more': { h: 'session.catch.bubble.more', s: 'session.catch.bubble.more.sub' },
  'bubble.up': { h: 'session.catch.bubble.up' },
  'bubble.won': { h: 'session.catch.bubble.won' },

  'net.setting': { s: 'session.catch.net.setting.sub' },
  'net.dozy': { s: 'session.catch.net.dozy.sub' },
  'net.ready': { h: 'session.catch.net.ready', s: 'session.catch.net.ready.sub' },
  'net.quick': { h: 'session.catch.net.quick', s: 'session.catch.net.quick.sub' },
  'net.faster': { h: 'session.catch.net.faster', s: 'session.catch.net.faster.sub' },
  'net.missed': { h: 'session.catch.net.missed', s: 'session.catch.net.missed.sub' },
  'net.won': { h: 'session.catch.net.won' },

  'vacuum.setting': { s: 'session.catch.vacuum.setting.sub' },
  'vacuum.ready': { h: 'session.catch.vacuum.ready', s: 'session.catch.vacuum.ready.sub' },
  'vacuum.holding': { h: 'session.catch.vacuum.holding', s: 'session.catch.vacuum.holding.sub' },
  'vacuum.letGo': { h: 'session.catch.vacuum.letGo', s: 'session.catch.vacuum.letGo.sub' },
  'vacuum.won': { h: 'session.catch.vacuum.won' },

  'envelope.setting': { s: 'session.catch.envelope.setting.sub' },
  'envelope.ready': { h: 'session.catch.envelope.ready', s: 'session.catch.envelope.ready.sub' },
  'envelope.three': { h: 'session.catch.envelope.three' },
  'envelope.two': { h: 'session.catch.envelope.two' },
  'envelope.last': { h: 'session.catch.envelope.last', s: 'session.catch.envelope.last.sub' },
  'envelope.seal': { h: 'session.catch.envelope.seal', s: 'session.catch.envelope.seal.sub' },
  'envelope.sealed': { h: 'session.catch.envelope.sealed' },
  'envelope.won': { h: 'session.catch.envelope.won' },
} as const satisfies Record<string, CaptionKeys>;

export type CaptionName = keyof typeof CAPTIONS;

/** A caption as a scene says it: its name, and what its words are filled with. */
export interface Caption {
  readonly name: CaptionName;
  readonly params?: Readonly<Record<string, string | number>>;
}

/** The two lines of a caption, in one language. */
export function captionLines(
  caption: Caption,
  translate: (key: StringKey, params?: Readonly<Record<string, string | number>>) => string,
): { readonly headline: string | null; readonly sub: string | null } {
  const keys: CaptionKeys = CAPTIONS[caption.name];
  return {
    headline: keys.h ? translate(keys.h, caption.params) : null,
    sub: keys.s ? translate(keys.s, caption.params) : null,
  };
}
