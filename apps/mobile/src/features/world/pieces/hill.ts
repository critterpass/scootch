import { fill, mound, PIECE_GROUND, type PieceArt } from '../piece-kit';

/** A low hill with a paler one behind it. */
export const hill: PieceArt = (roll, inks) => {
  const height = 20 + roll(1) * 8;
  return [
    fill(mound(34, 96, height * 0.7), inks.groundEdge),
    fill(mound(6, 74, height), inks.moss, 0.85),
    fill([['O', 30 + roll(2) * 20, PIECE_GROUND - height * 0.55, 2.5]], inks.paper, 0.6),
  ];
};
