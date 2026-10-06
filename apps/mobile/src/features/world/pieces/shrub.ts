import { fill, PIECE_GROUND, shadow, type PieceArt } from '../piece-kit';

/** A round shrub of three leafy lumps. */
export const shrub: PieceArt = (roll, inks) => {
  const size = 15 + roll(1) * 5;
  return [
    shadow(50, 52, inks),
    fill([['O', 36, PIECE_GROUND - size, size]], inks.moss),
    fill([['O', 62, PIECE_GROUND - size * 0.9, size * 0.9]], inks.moss),
    fill([['O', 49, PIECE_GROUND - size * 1.7, size * 1.1]], inks.moss),
    fill([['O', 44, PIECE_GROUND - size * 1.9, 3]], inks.paper, 0.5),
    ...(roll(2) > 0.5 ? [fill([['O', 60, PIECE_GROUND - size * 1.3, 3.5]], inks.tomato)] : []),
  ];
};
