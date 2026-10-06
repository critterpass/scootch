import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useKeepsakes } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';

import { useLighthouse } from './use-lighthouse';
import { WorldScreen } from './world-screen';

/** The world on the real phone, read from the phone's own tables each time it is opened. */
export function WorldContainer() {
  const router = useRouter();
  const { palette } = useScreenStyle();
  // Someone who owns lifetime finds the lighthouse here, landed before the world is read.
  const { landed } = useLighthouse();
  const { keepsakes } = useKeepsakes(landed);
  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  return (
    <WorldScreen
      model={{ pieces: keepsakes.pieces, monsters: keepsakes.monsters }}
      actions={{
        close: () => router.replace('/'),
        openZoo: () => router.replace('/zoo'),
        openRecord: () => router.replace('/record'),
      }}
    />
  );
}
