import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The share panel, with the story of a catch and the switch that hides the task. */
export const shareStory = keepState({
  id: 'share-story',
  design: { board: KEEPSAKES_BOARD, section: '04 Made to share', screen: 'Story · caught' },
  capture: { screen: 'share' },
});
