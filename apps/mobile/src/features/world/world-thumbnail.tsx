import type { ReactNode } from 'react';

import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';
import { asRows, fixtureMonsters, fixturePieces } from '../reveal/registry/keep-fixtures';

import { Island } from './island';
import { finishedThings } from './landmarks';

export interface WorldGlanceValue {
  /** How many finished things live in the world, or `null` until the phone has read it. */
  readonly count: number | null;
  /** The world itself, small and alive, `size` points a side. */
  readonly thumbnail: (size: number) => ReactNode;
}

type Draw = (glance: WorldGlanceValue) => ReactNode;

/** The world a registry capture shows in a row: a week's worth, with nothing read from storage. */
const CAPTURED_THINGS = 7;

function Live({ children }: { readonly children: Draw }) {
  const { keepsakes } = useKeepsakes();
  const { settings } = useToday();
  const { reducedMotion } = useScreenStyle();
  return children({
    count: keepsakes ? finishedThings(keepsakes.pieces) : null,
    thumbnail: (size) =>
      keepsakes ? (
        <Island
          pieces={keepsakes.pieces}
          monsters={keepsakes.monsters}
          size={size}
          mood="asleep"
          still={reducedMotion || settings.motion === 'calm'}
        />
      ) : null,
  });
}

function Captured({ children }: { readonly children: Draw }) {
  return children({
    count: CAPTURED_THINGS,
    thumbnail: (size) => (
      <Island
        pieces={fixturePieces(CAPTURED_THINGS)}
        monsters={asRows(fixtureMonsters(CAPTURED_THINGS))}
        size={size}
        mood="asleep"
        still
      />
    ),
  });
}

/**
 * The world at a glance, for a row that leads to it: the count and a small living island, with
 * Scootch asleep in the middle as he is on a finished day. On the phone it is read from the
 * phone's own tables; a registry capture has no tables behind it and shows a fixed week.
 */
export function WorldGlance({ children }: { readonly children: Draw }) {
  const { captured } = useScreenStyle();
  return captured ? <Captured>{children}</Captured> : <Live>{children}</Live>;
}
