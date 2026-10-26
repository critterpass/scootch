import { SessionScreen } from '../features/session/session-screen';

/**
 * A running period. It replaces the desk with a crossfade and no swipe back (its motion is named
 * in `stack-transitions.ts`); the classroom's camera pulls back inside it. The way out is Done or
 * Not yet.
 */
export default function Session() {
  return <SessionScreen />;
}
