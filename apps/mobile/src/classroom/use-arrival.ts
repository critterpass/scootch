import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useState } from 'react';

/** If the screen's transition never says it has ended, the screen counts as arrived after this. */
export const ARRIVAL_FALLBACK_MS = 260;

/**
 * Whether the screen has finished arriving: false until its own transition has ended, true at once
 * where nothing may move. A screen that replaces another holding the same room starts its camera
 * on it, so only one room is ever on screen while the camera moves.
 */
export function useArrival(mayMove: boolean): boolean {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const [arrived, setArrived] = useState(!mayMove);
  useEffect(() => {
    if (arrived) return undefined;
    const arrive = () => setArrived(true);
    const timer = setTimeout(arrive, ARRIVAL_FALLBACK_MS);
    const stop = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) arrive();
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [arrived, navigation]);
  return arrived || !mayMove;
}
