import { fill, PIECE_GROUND, polygon, shadow, type PieceArt } from '../piece-kit';

/** A little house with a door, and sometimes a chimney. */
export const house: PieceArt = (roll, inks) => {
  const width = 36 + roll(1) * 8;
  const wall = 24 + roll(2) * 6;
  const left = 50 - width / 2;
  const eaves = PIECE_GROUND - wall;
  return [
    shadow(50, width + 14, inks),
    ...(roll(3) > 0.5
      ? [
          fill(
            polygon([
              [left + width * 0.68, eaves - 20],
              [left + width * 0.82, eaves - 20],
              [left + width * 0.82, eaves],
              [left + width * 0.68, eaves],
            ]),
            inks.ink,
          ),
        ]
      : []),
    fill(
      polygon([
        [left, eaves],
        [left + width, eaves],
        [left + width, PIECE_GROUND],
        [left, PIECE_GROUND],
      ]),
      inks.paper,
    ),
    fill(
      polygon([
        [left - 5, eaves],
        [50, eaves - 20],
        [left + width + 5, eaves],
      ]),
      inks.clay,
    ),
    fill(
      polygon([
        [46, PIECE_GROUND - 13],
        [54, PIECE_GROUND - 13],
        [54, PIECE_GROUND],
        [46, PIECE_GROUND],
      ]),
      inks.ink,
    ),
  ];
};
