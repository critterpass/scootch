import { File, Paths } from 'expo-file-system';

// The camera's files on the real phone. Nothing here is covered by the unit tests: it runs only
// in a native build.

const BEFORE_NAME = 'camera-before.jpg';

/** Deletes a photo. One already gone, or never written, is no error: nothing is kept either way. */
export function discardPhoto(uri: string | null): void {
  if (uri === null) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing to delete.
  }
}

/**
 * Keeps the photo a session begins with, in the app's own folder, in place of any kept before it.
 * Returns where it is, or `null` when it could not be kept (and then nothing is asked later).
 */
export async function keepBeforePhoto(uri: string): Promise<string | null> {
  try {
    const kept = new File(Paths.document, BEFORE_NAME);
    if (kept.exists) kept.delete();
    await new File(uri).copy(kept);
    return kept.uri;
  } catch {
    return null;
  }
}
