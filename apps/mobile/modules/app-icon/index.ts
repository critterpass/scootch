import { nativeScootchAppIconModule as native } from './src/ScootchAppIconModule';

/** False on Android, and where the system does not let an app change its icon. */
export function isSupported(): boolean {
  return native?.supported() ?? false;
}

/** The name of the alternate icon that is on, or `null` for the app's own. */
export function current(): string | null {
  return native?.current() ?? null;
}

/**
 * Puts an icon on by the name it is declared under (`app.config.ts`); `null` is the app's own.
 * iOS shows its own alert each time, so this is only called while the app is in front. Rejects
 * when the system refuses.
 */
export async function set(name: string | null): Promise<void> {
  if (!native) throw new Error('No icon module in this binary');
  await native.set(name);
}
