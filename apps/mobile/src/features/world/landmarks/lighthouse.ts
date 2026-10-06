import { fill, PIECE_GROUND, polygon, shadow, stroke, type PieceArt } from '../piece-kit';

/**
 * The lifetime landmark: a striped lighthouse with a lit lamp. It is drawn with the world's own
 * piece kit, in the same box and on the same ground line as every other piece. It lives outside
 * the pieces folder on purpose: a drawing in there is dealt out to ordinary pieces by their seed.
 */
export const lighthouse: PieceArt = (_roll, inks) => {
  const centre = 50;
  const foot = PIECE_GROUND;
  const tower = polygon([
    [centre - 15, foot],
    [centre - 9, 34],
    [centre + 9, 34],
    [centre + 15, foot],
  ]);
  const band = (top: number, bottom: number) => {
    const half = (y: number) => 9 + ((y - 34) / (foot - 34)) * 6;
    return polygon([
      [centre - half(bottom), bottom],
      [centre - half(top), top],
      [centre + half(top), top],
      [centre + half(bottom), bottom],
    ]);
  };
  return [
    shadow(centre, 44, inks),
    fill(tower, inks.paper),
    fill(band(48, 60), inks.tomato),
    fill(band(72, 84), inks.tomato),
    stroke(tower, inks.ink, 3),
    fill(
      polygon([
        [centre - 12, 34],
        [centre - 12, 22],
        [centre + 12, 22],
        [centre + 12, 34],
      ]),
      inks.clay,
      0.35,
    ),
    fill(
      polygon([
        [centre - 7, 32],
        [centre - 7, 24],
        [centre + 7, 24],
        [centre + 7, 32],
      ]),
      '#FFE9A8',
    ),
    stroke(
      [
        ['M', centre - 13, 34],
        ['L', centre + 13, 34],
      ],
      inks.ink,
      3,
    ),
    fill(
      polygon([
        [centre - 13, 22],
        [centre, 10],
        [centre + 13, 22],
      ]),
      inks.ink,
    ),
  ];
};
