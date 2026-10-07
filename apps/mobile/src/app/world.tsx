import { usePreventZoomTransitionDismissal } from 'expo-router';

import { WorldContainer } from '../features/world/world-container';

/** Where a swipe back may start when the world was zoomed out of its button: the leading edge. */
const SWIPE_BACK_EDGE = { maxX: 44 } as const;

/**
 * The world: everything finished, as a place. The one screen's world button opens it, and it grows
 * out of that button. The island is dragged and tapped all over, so the swipe that shrinks the
 * world back starts at the edge only, as it does when the world was pushed.
 */
export default function WorldRoute() {
  usePreventZoomTransitionDismissal({ unstable_dismissalBoundsRect: SWIPE_BACK_EDGE });
  return <WorldContainer />;
}
