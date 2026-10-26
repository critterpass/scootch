import { drawAsImage, Group, ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library/legacy';
import { shareAsync } from 'expo-sharing';
import type { ReactElement } from 'react';

import { CARD_HEIGHTS, CARD_WIDTH, EXPORT_SCALE, type CardShape } from './cards/card-parts';

/**
 * Draws a card offscreen on the phone at 1080 × 1350 (a post) or 1080 × 1920 (a story) and keeps
 * it as a PNG in the cache. Nothing is sent anywhere to make it.
 */
export async function exportCard(
  card: ReactElement,
  shape: CardShape,
  name: string,
): Promise<string> {
  const width = CARD_WIDTH * EXPORT_SCALE;
  const height = CARD_HEIGHTS[shape] * EXPORT_SCALE;
  const image = await drawAsImage(<Group transform={[{ scale: EXPORT_SCALE }]}>{card}</Group>, {
    width,
    height,
  });
  if (image === null) throw new Error('The card could not be drawn');
  const file = new File(Paths.cache, `phusclass-${name}-${shape}.png`);
  if (file.exists) file.delete();
  file.create();
  await file.write(image.encodeToBytes(ImageFormat.PNG));
  return file.uri;
}

export type SaveResult = 'saved' | 'not allowed';

/** Adds the image to Photos, asking only to add (never to read) the first time. */
export async function saveToPhotos(uri: string): Promise<SaveResult> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) return 'not allowed';
  await saveToLibraryAsync(uri);
  return 'saved';
}

/** The system share sheet, with the image. */
export async function shareImage(uri: string, title: string): Promise<void> {
  await shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
}
