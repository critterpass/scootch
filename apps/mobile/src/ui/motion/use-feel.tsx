import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { useForcedVariant } from '../../screens/registry/support/forced-variant';

import { feelFor, type Feel, type MotionCare } from './may-move';

/** What the person's settings and the day say about motion and touch. */
export interface FeelSettings {
  readonly motion: 'full' | 'calm';
  readonly care: MotionCare;
  /** The Haptics switch. */
  readonly haptics: boolean;
}

// Outside the provider (a unit under test, a screen drawn alone) only the system setting decides.
const FeelContext = createContext<FeelSettings>({ motion: 'full', care: 'none', haptics: true });

/** Hands the Motion and Haptics switches and the day's care to everything below. */
export function FeelProvider({
  motion,
  care,
  haptics,
  children,
}: FeelSettings & { readonly children: ReactNode }) {
  const value = useMemo(() => ({ motion, care, haptics }), [motion, care, haptics]);
  return <FeelContext.Provider value={value}>{children}</FeelContext.Provider>;
}

export interface AppFeel extends Feel {
  /** Whether a touch may be answered with a haptic tap. Never under a capture. */
  readonly haptics: boolean;
}

/**
 * The single source of "may this move, may this tap back": the system's Reduce Motion, the app's
 * Motion and Haptics switches, a registry capture, and the care the day asks for. Every press,
 * entrance, burst and character reads it here and nowhere else.
 */
export function useFeel(): AppFeel {
  const settings = useContext(FeelContext);
  const systemReducedMotion = useReducedMotion();
  const captured = useForcedVariant() !== undefined;
  return useMemo(
    () => ({
      ...feelFor({ systemReducedMotion, motion: settings.motion, captured, care: settings.care }),
      haptics: settings.haptics && !captured,
    }),
    [systemReducedMotion, captured, settings],
  );
}

/** Whether the interface may move here: false means a crossfade at most. */
export function useMayMove(): boolean {
  return useFeel().mayMove;
}

/** The motion props a drawn character takes, so it obeys the same switches as everything else. */
export function useCharacterMotion(): Feel['character'] {
  return useFeel().character;
}
