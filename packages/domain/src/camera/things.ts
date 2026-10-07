/** `[x, y, width, height]`, each 0..1 of the upright photo, from its top-left corner. */
export type Box = readonly [x: number, y: number, width: number, height: number];

/** One separate thing the phone found in a photo, with the names its recogniser gives it. */
export interface FoundThing {
  readonly id: string;
  readonly box: Box;
  /** Best first. May be empty: a thing can be seen without being named. */
  readonly labels: readonly string[];
}

export function boxArea(box: Box): number {
  return box[2] * box[3];
}

export function boxCentre(box: Box): readonly [x: number, y: number] {
  return [box[0] + box[2] / 2, box[1] + box[3] / 2];
}

/** How far a box's centre is from the nearest edge of the photo; 0 on the edge, 0.5 dead centre. */
export function edgeDistance(box: Box): number {
  const [x, y] = boxCentre(box);
  return Math.min(x, 1 - x, y, 1 - y);
}
