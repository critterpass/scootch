import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { goBack } from '../../ui/motion/go-back';
import { useScreenStyle } from '../../ui/use-screen-style';

import { SharePanel } from './share-panel';
import { useShareRequest } from './share-request';
import { useComposer } from './use-share';

/**
 * The composer on the real phone: a sheet over whichever screen asked for it, showing what that
 * screen handed over. Opened with nothing to show (a link, a crisis day) it closes again.
 */
export function ShareContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { today } = useToday();
  const { palette } = useScreenStyle();
  const request = useShareRequest();
  const close = useCallback(() => goBack(router, '/'), [router]);
  const panel = useComposer(language, today, request, close);
  const nothing = request === null || today.kind === 'crisis';
  useEffect(() => {
    if (nothing) close();
  }, [nothing, close]);

  // A month's poster is drawn once the phone's tables have been read: the page waits for it.
  if (!panel) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  return <SharePanel {...panel} />;
}
