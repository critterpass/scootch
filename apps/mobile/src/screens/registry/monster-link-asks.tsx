import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A monster's link whose page hides what it hatched from: its card, and one field for the thing. */
export const monsterLinkAsks: ScreenState = {
  id: 'monster-link-asks',
  design: null,
  undesignedReason:
    'No board draws a monster arriving from the website. A page that hides its words carries no thing, so the app shows the card and asks for it.',
  component: lazy(() =>
    import('../../features/arrive/captures').then((captures) => ({
      default: captures.MonsterLinkAsks,
    })),
  ),
  variants: standardVariants(),
};
