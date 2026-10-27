import {
  nativePhusclassFoldModule as native,
  type NativeFoldReading,
} from './src/PhusclassFoldModule';

export type { NativeFoldReading } from './src/PhusclassFoldModule';

/** The hinge now, or null where nothing reports one (a binary without the module). */
export function currentFold(): NativeFoldReading | null {
  return native?.current() ?? null;
}

/** Calls back with each change of the hinge or the fold; returns the way to stop. */
export function watchFold(onFold: (reading: NativeFoldReading) => void): () => void {
  if (!native) return () => undefined;
  const subscription = native.addListener('onFold', onFold);
  return () => subscription.remove();
}
