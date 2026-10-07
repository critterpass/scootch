import { keepState, MATERIALS_BOARD } from '../../features/reveal/registry/keep-state';

/** The share panel on the story of a catch: a riso print, with the switch that hides the task. */
export const shareStory = keepState({
  id: 'share-story',
  design: { board: MATERIALS_BOARD, section: '04 Made to share', screen: 'Story · caught, riso' },
  capture: { screen: 'share', format: 'story' },
});
