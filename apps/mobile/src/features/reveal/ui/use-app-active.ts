import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Whether the app is in front. In the background nothing on a card is worked out. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setActive(next === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return active;
}
