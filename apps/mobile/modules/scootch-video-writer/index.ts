import { nativeScootchVideoWriterModule as native } from './src/ScootchVideoWriterModule';

/** False on Android and in a build made before the writer existed: pictures are then shared still. */
export function isAvailable(): boolean {
  return native !== null;
}

/**
 * Writes the pictures at `frameUris`, in order, as an H.264 video at `outputUri`, each shown for
 * one frame. Every picture must be the same size. Resolves to the video's address; rejects when
 * there is no writer here, when a picture cannot be read or when the file cannot be written.
 */
export async function writeVideo(
  frameUris: readonly string[],
  framesPerSecond: number,
  outputUri: string,
): Promise<string> {
  if (!native) throw new Error('No video writer in this build');
  return native.writeVideo([...frameUris], framesPerSecond, outputUri);
}
