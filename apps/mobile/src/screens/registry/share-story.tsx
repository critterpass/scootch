import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The share panel on the story of a catch: a riso print, with the switch that hides the task. */
export const shareStory = keepState({
  id: 'share-story',
  design: { board: KEEPSAKES_BOARD, section: MADE_TO_SHARE, screen: 'Caught · story · holo' },
  capture: { screen: 'share', format: 'story' },
});
