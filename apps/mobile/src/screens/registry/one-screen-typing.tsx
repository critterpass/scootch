import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The capsule as a text field with text in it, so the send button is showing. */
export const oneScreenTyping: ScreenState = {
  id: 'one-screen-typing',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Typing' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTyping,
    })),
  ),
  variants: standardVariants(['keyboard-open']).filter(
    (variant) => variant.condition !== undefined,
  ),
};
