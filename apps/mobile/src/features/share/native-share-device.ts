import {
  BlendMode,
  ClipOp,
  FillType,
  ImageFormat,
  matchFont,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkShader,
} from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import * as VideoWriter from '../../../modules/scootch-video-writer';
import { GRAIN_GREY, toSkiaNodes, type SkiaNode, type SkiaPaint } from '../../art/skia-nodes';

import type { ShareDevice } from './share-flow';
import type { ShareImage } from './share-image';

// The real phone behind sharing. Nothing here is covered by the unit tests, which use a recorder:
// it runs only in a native build.

/** A shared picture is this many pixels wide, whatever the phone. */
const PIXELS_WIDE = 1080;
/** A frame of a shared video: narrower, since there are forty of them to draw and encode. */
const VIDEO_PIXELS_WIDE = 720;

// The same faces the on-screen renderer picks.
const FAMILIES = {
  rounded: Platform.select({ ios: 'ui-rounded', default: 'sans-serif' }),
  sans: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }),
};
const WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

const BLENDS = {
  srcOver: BlendMode.SrcOver,
  multiply: BlendMode.Multiply,
  screen: BlendMode.Screen,
  overlay: BlendMode.Overlay,
  softLight: BlendMode.SoftLight,
} as const;

/** The gradient or the noise a paint fills its path with. */
function shaderOf(paint: SkiaPaint): SkShader {
  if (paint.kind === 'grain') {
    return Skia.Shader.MakeFractalNoise(paint.frequency, paint.frequency, 3, 0, 0, 0);
  }
  const colors = paint.colors.map((color) => Skia.Color(color));
  const positions = [...paint.positions];
  return paint.kind === 'linear'
    ? Skia.Shader.MakeLinearGradient(paint.start, paint.end, colors, positions, TileMode.Clamp)
    : Skia.Shader.MakeRadialGradient(paint.centre, paint.radius, colors, positions, TileMode.Clamp);
}

function draw(canvas: SkCanvas, node: SkiaNode): void {
  if (node.kind === 'group') {
    canvas.save();
    if (node.matrix) canvas.concat([...node.matrix]);
    const clip = node.clip === undefined ? null : Skia.Path.MakeFromSVGString(node.clip);
    if (clip) canvas.clipPath(clip, ClipOp.Intersect, true);
    for (const child of node.children) draw(canvas, child);
    canvas.restore();
    return;
  }
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  if (node.kind === 'paint') {
    const filled = Skia.Path.MakeFromSVGString(node.path);
    if (!filled) return;
    paint.setShader(shaderOf(node.paint));
    if (node.paint.kind === 'grain') {
      paint.setColorFilter(Skia.ColorFilter.MakeMatrix([...GRAIN_GREY]));
    }
    paint.setAlphaf(node.opacity);
    paint.setBlendMode(BLENDS[node.blend]);
    canvas.drawPath(filled, paint);
    return;
  }
  paint.setColor(Skia.Color(node.color));
  paint.setAlphaf(node.opacity);
  if (node.kind === 'text') {
    const font = matchFont({
      fontFamily: FAMILIES[node.font],
      fontSize: node.size,
      fontStyle: node.italic ? 'italic' : 'normal',
      fontWeight: WEIGHTS[Math.min(8, Math.max(0, Math.round(node.weight / 100) - 1))] ?? '400',
    });
    const width = node.align === 'left' ? 0 : font.measureText(node.text).width;
    const x = node.align === 'center' ? node.x - width / 2 : node.x - width;
    canvas.drawText(node.text, x, node.y, paint, font);
    return;
  }
  const path = Skia.Path.MakeFromSVGString(node.path);
  if (!path) return;
  if (node.kind === 'fill') {
    path.setFillType(node.fillType === 'evenOdd' ? FillType.EvenOdd : FillType.Winding);
  } else {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(node.width);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
  }
  canvas.drawPath(path, paint);
}

function freshFile(name: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  return file;
}

/** Draws one picture off screen, `pixelsWide` wide, and writes it as a PNG file. */
function writePng(image: ShareImage, name: string, pixelsWide: number): File {
  const scale = pixelsWide / image.width;
  const surface = Skia.Surface.MakeOffscreen(pixelsWide, Math.round(image.height * scale));
  if (!surface) throw new Error('No off-screen surface');
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  for (const node of toSkiaNodes(image.commands)) draw(canvas, node);
  surface.flush();
  const file = freshFile(`${name}.png`);
  file.writeSync(surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG, 100));
  return file;
}

/** The frames as files, stitched into one video; the frame files are removed whatever happens. */
async function writeVideo(
  frames: readonly ShareImage[],
  name: string,
  framesPerSecond: number,
): Promise<string> {
  const files: File[] = [];
  try {
    frames.forEach((frame, index) => {
      files.push(writePng(frame, `${name}-frame-${index}`, VIDEO_PIXELS_WIDE));
    });
    const output = new File(Paths.cache, `${name}.mp4`);
    if (output.exists) output.delete();
    return await VideoWriter.writeVideo(
      files.map((file) => file.uri),
      framesPerSecond,
      output.uri,
    );
  } finally {
    for (const file of files) if (file.exists) file.delete();
  }
}

export const nativeShareDevice: ShareDevice = {
  renderPng(image, name) {
    try {
      return Promise.resolve(writePng(image, name, PIXELS_WIDE).uri);
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('Could not draw'));
    }
  },
  // Only a build that carries the video writer can turn a card; the others share it still.
  ...(VideoWriter.isAvailable() ? { renderVideo: writeVideo } : {}),
  writeFile(name, bytes) {
    const file = freshFile(name);
    file.writeSync(bytes);
    return Promise.resolve(file.uri);
  },
  async openShareSheet(uri, mimeType, link) {
    // The picture and its page's link go to the sheet together, which only iOS's own sheet does.
    if (link !== undefined && Platform.OS === 'ios') await Share.share({ url: uri, message: link });
    else await Sharing.shareAsync(uri, { mimeType });
  },
  async saveToPhotos(uri) {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return 'refused';
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  },
};
