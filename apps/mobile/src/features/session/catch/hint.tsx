import { forwardRef, useImperativeHandle, useRef } from 'react';

import type { SessionInks } from '../ui/session-inks';

import { Ink, type InkHandle } from './ink';

/** How long one showing of the hint takes to draw, how long it then fades, and the pause after. */
const DRAW = 1.1;
const FADE = 0.4;
const EVERY = 3.2;

export interface HintHandle {
  /**
   * Shows the gesture as a dotted line along `path`, `seconds` into its showing; `null` puts it
   * away. Called every frame: it draws again only while there is something to see.
   */
  readonly show: (seconds: number | null, path: string) => void;
}

/**
 * The gesture a catch is waiting for, traced as a dotted tomato line that draws itself, fades and
 * comes round again. It is only a hint: it takes no touch and goes the moment a finger lands.
 */
export const Hint = forwardRef<HintHandle, { readonly inks: SessionInks }>(function Hint(
  { inks },
  ref,
) {
  const ink = useRef<InkHandle>(null);
  const shown = useRef(false);
  useImperativeHandle(
    ref,
    () => ({
      show: (seconds, path) => {
        const at = seconds === null ? null : seconds % EVERY;
        if (at === null || at > DRAW + FADE || path === '') {
          if (shown.current) ink.current?.draw([]);
          shown.current = false;
          return;
        }
        shown.current = true;
        ink.current?.draw([
          {
            d: path,
            width: 3.5,
            color: inks.tomato,
            dash: [1, 9],
            end: Math.min(1, at / DRAW),
            opacity: at < DRAW ? 0.9 : 0.9 * (1 - (at - DRAW) / FADE),
          },
        ]);
      },
    }),
    [inks.tomato],
  );
  return <Ink ref={ink} style={{ zIndex: 9 }} />;
});
