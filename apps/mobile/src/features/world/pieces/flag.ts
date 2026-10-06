import { fill, PIECE_GROUND, polygon, shadow, stroke, type PieceArt } from '../piece-kit';

/** A little flag on a pole, leaning a touch. */
export const flag: PieceArt = (roll, inks) => {
  const lean = (roll(1) - 0.5) * 8;
  const top = 30 + roll(2) * 10;
  const pole = 50;
  return [
    shadow(pole, 26, inks),
    stroke(
      [
        ['M', pole, PIECE_GROUND],
        ['L', pole + lean, top],
      ],
      inks.ink,
      4,
    ),
    fill(
      polygon([
        [pole + lean, top],
        [pole + lean + 26, top + 8],
        [pole + lean * 0.8, top + 18],
      ]),
      inks.tomato,
    ),
  ];
};
