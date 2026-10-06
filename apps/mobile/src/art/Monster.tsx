import { useMemo } from 'react';

import { buildMonster } from '@scootch/art';

import { CharacterCanvas, CommandLayer } from './skia-commands';

export interface MonsterProps {
  readonly spec: Parameters<typeof buildMonster>[0];
  /** An extra scale on top of the spec's own size, for a shrink step that is not stored yet. */
  readonly sizeFactor?: number;
  /** Width and height in points. */
  readonly size?: number;
  readonly testID?: string;
}

/** One monster, drawn still with Skia. Its commands are built once per spec and size factor. */
export function Monster({ spec, sizeFactor = 1, size = 200, testID }: MonsterProps) {
  const commands = useMemo(() => buildMonster(spec, sizeFactor), [spec, sizeFactor]);
  return (
    <CharacterCanvas size={size} {...(testID ? { testID } : {})}>
      <CommandLayer commands={commands} />
    </CharacterCanvas>
  );
}
