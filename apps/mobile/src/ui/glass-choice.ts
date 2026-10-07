/** What the phone says about Liquid Glass, read once from the glass module. */
export interface GlassFacts {
  /** The app draws with the Liquid Glass design: iOS 26 or later, and not opted out of it. */
  readonly liquidGlass: boolean;
  /** The glass effect classes exist at run time. Some early iOS 26 builds lack them. */
  readonly glassApi: boolean;
}

/** `liquid` is the system's own glass; `fallback` is the translucent fill with a hairline edge. */
export type GlassDraw = 'liquid' | 'fallback';

/**
 * How a glass surface is drawn on this phone. Both facts must hold for the system's glass: where
 * either is missing (iOS 16 to 18, Android, a phone that reports nothing) the fallback is drawn,
 * so a surface never asks for an effect the system cannot make.
 */
export function glassDraw(facts: GlassFacts): GlassDraw {
  return facts.liquidGlass && facts.glassApi ? 'liquid' : 'fallback';
}

/** Who answers a press on a control: the system's glass, or the app's own press spring. */
export type PressOwner = 'glass' | 'spring';

/**
 * A pressed glass control is answered once. On the system's glass, an interactive surface lights
 * and stretches under the finger by itself, so the press spring stays still and only the haptic is
 * the app's. Everywhere else the press spring is the whole answer.
 */
export function pressOwner(draw: GlassDraw, interactive: boolean): PressOwner {
  return draw === 'liquid' && interactive ? 'glass' : 'spring';
}
