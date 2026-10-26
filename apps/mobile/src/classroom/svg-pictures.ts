import { Skia, type SkPicture } from '@shopify/react-native-skia';

/**
 * Each still piece of a classroom figure is board SVG. It is parsed by Skia's SVG module once and
 * recorded into a picture, which then replays every frame for the cost of a draw call: moving the
 * camera or a layer never parses or walks SVG again.
 *
 * A piece's coordinates are its figure's own, and can stray outside the figure (steam rises above
 * his head), so the document's viewport is a generous square around them, drawn one unit to one.
 */
const REACH = 3000;
const SIZE = REACH * 3;
const cache = new Map<string, SkPicture | null>();

/** The picture for one piece, or null if Skia could not read it (it is then not drawn). */
export function svgPicture(markup: string, defs: string): SkPicture | null {
  const key = defs + '\u0000' + markup;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const doc =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" ` +
    `viewBox="${-REACH} ${-REACH} ${SIZE} ${SIZE}"><defs>${defs}</defs>${markup}</svg>`;
  const svg = Skia.SVG.MakeFromString(doc);
  let picture: SkPicture | null = null;
  if (svg) {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(-REACH, -REACH, SIZE, SIZE));
    canvas.translate(-REACH, -REACH);
    canvas.drawSvg(svg, SIZE, SIZE);
    picture = recorder.finishRecordingAsPicture();
  }
  cache.set(key, picture);
  return picture;
}
