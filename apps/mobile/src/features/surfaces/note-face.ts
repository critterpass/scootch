import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import type { NotificationContentAttachmentIos } from 'expo-notifications';
import { Platform } from 'react-native';

import calm from '../../../targets/notification-service/NoteArt.xcassets/PhuFigureCalm.imageset/PhuFigureCalm.png';
import crossed from '../../../targets/notification-service/NoteArt.xcassets/PhuFigureCrossed.imageset/PhuFigureCrossed.png';
import name from '../../../targets/notification-service/NoteArt.xcassets/PhuFigureName.imageset/PhuFigureName.png';
import over from '../../../targets/notification-service/NoteArt.xcassets/PhuFigureOver.imageset/PhuFigureOver.png';
import ruler from '../../../targets/notification-service/NoteArt.xcassets/PhuFigureRuler.imageset/PhuFigureRuler.png';
import stare from '../../../targets/notification-service/NoteArt.xcassets/PhuFigureStare.imageset/PhuFigureStare.png';

/**
 * His figure at each pressure step, 0 to 5: the same pictures the notification service extension
 * attaches to a note from the server (`targets/notification-service`), baked by packages/art.
 * A local note never passes through that extension, so the app attaches the picture itself.
 */
const LADDER = [calm, over, crossed, ruler, name, stare] as const;

/**
 * The picture for a local note at this pressure step, as a notification attachment, or `null`
 * off iOS or when it cannot be made. The system moves an attachment's file into its own store,
 * so it is given a copy in the cache, never the bundled file.
 */
export async function noteFaceAttachment(
  step: number,
): Promise<NotificationContentAttachmentIos | null> {
  if (Platform.OS !== 'ios' || !Number.isFinite(step)) return null;
  const index = Math.min(LADDER.length - 1, Math.max(0, Math.round(step)));
  try {
    const asset = await Asset.fromModule(LADDER[index] as number).downloadAsync();
    if (asset.localUri === null) return null;
    const copy = new File(Paths.cache, `note-face-${index}-${Date.now()}.png`);
    await new File(asset.localUri).copy(copy);
    return { identifier: 'phu', url: copy.uri, type: 'public.png' };
  } catch {
    return null;
  }
}
