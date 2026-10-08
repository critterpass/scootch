import type { MonsterRow, MonsterSpec, WorldPieceRow } from '@scootch/domain';

/** The App Group's key-value store, shared with the widget extension. Values are strings. */
export interface SharedStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Asks the system to draw the widgets and the control again. */
  reloadSurfaces(): void;
}

/** Files in the App Group container, where the widget extension can read them. */
export interface SharedFiles {
  exists(name: string): boolean;
  write(name: string, bytes: Uint8Array): Promise<void>;
  /** The names of the files already there. */
  list(): string[];
  remove(name: string): void;
}

/** Draws a monster to PNG bytes, off screen. `null` when the phone could not draw it. */
export interface MonsterPainter {
  paint(spec: MonsterSpec, pixels: number): Promise<Uint8Array | null>;
}

/** Draws the world with Scootch in the middle of it, awake or asleep, to PNG bytes. `null` when it could not. */
export interface WorldPainter {
  paint(
    pieces: readonly WorldPieceRow[],
    monsters: readonly MonsterRow[],
    pixels: number,
    asleep: boolean,
  ): Promise<Uint8Array | null>;
  /** Scootch alone, pleased, for the wallpaper he is perched on. */
  paintScootch(pixels: number): Promise<Uint8Array | null>;
}

/** The keys both sides agree on (`targets/_shared/AppGroup.swift`). */
export const SHARED_KEYS = {
  snapshot: 'surfaces.snapshot',
  pendingActions: 'surfaces.pending-actions',
  hunt: 'surfaces.hunt',
  /** The thing "Hunt at 9:00" was pressed for (`targets/_shared/MorningHunt.swift`). */
  morningHunt: 'surfaces.morning-hunt',
} as const;
