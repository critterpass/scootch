import type { CardFinishInks } from '../finish';

/** Two-colour print: orange and blue ink on warm white, with a foil in the same two inks. */
export const riso: CardFinishInks = {
  frame: '#F0562E',
  paper: '#FBF8F2',
  panel: '#FCE1D8',
  panelDot: '#2F3E9E',
  tile: '#FCE1D8',
  ink: '#26327F',
  muted: '#5B66AE',
  flavour: '#26327F',
  accent: '#F0562E',
  onAccent: '#FBF8F2',
  pill: '#FBF8F2',
  pillInk: '#26327F',
  foil: ['#F0562E', '#FF9A7E', '#FBF8F2', '#8C97E0', '#2F3E9E'],
  foilAlpha: 0.22,
  glare: '#FFFFFF',
};
