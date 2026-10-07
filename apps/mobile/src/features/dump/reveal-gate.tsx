import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useScreenStyle } from '../../ui/use-screen-style';

import { dockShows } from './choosing-script';

export interface RevealGateProps {
  /** The screen believes the reveal is still playing. */
  readonly playing: boolean;
  /** The longest the dock may stay away: the reveal's own length and a margin. */
  readonly capMs: number;
  /** Called if the cap passes with the reveal still unreported: it is over, whatever happened. */
  readonly onCap: () => void;
  /** The dock. */
  readonly children: ReactNode;
}

/**
 * Keeps the dock away while the reveal plays, and never longer than the cap. The reveal reports
 * its own end; if for any reason it does not, the cap ends it, so the one thing can not be left
 * on the screen with nothing to tap. A capture, which holds the reveal on one beat, has no dock.
 */
export function RevealGate({ playing, capMs, onCap, children }: RevealGateProps) {
  const { captured } = useScreenStyle();
  const [capped, setCapped] = useState(false);
  const cap = useRef(onCap);
  cap.current = onCap;

  useEffect(() => {
    if (!playing || captured) return undefined;
    const timer = setTimeout(() => {
      setCapped(true);
      cap.current();
    }, capMs);
    return () => clearTimeout(timer);
  }, [playing, captured, capMs]);

  return dockShows(playing, capped ? capMs : 0, capMs) ? children : null;
}
