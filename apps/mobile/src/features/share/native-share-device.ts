import {
  ClipOp,
  FillType,
  ImageFormat,
  matchFont,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
} from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import { toSkiaNodes, type SkiaNode } from '../../art/skia-nodes';

import type { ShareDevice } from './share-flow';

// The real phone behind sharing. Nothing here is covered by the unit tests, which use a recorder:
// it runs only in a native build.

/** A shared picture is this many pixels wide, whatever the phone. */
const PIXELS_WIDE = 1080;

// The same faces the on-screen renderer picks.
const FAMILIES = {
  rounded: Platform.select({ ios: 'ui-rounded', default: 'sans-serif' }),
  sans: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }),
};
const WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

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

export const nativeShareDevice: ShareDevice = {
  renderPng(image, name) {
    const scale = PIXELS_WIDE / image.width;
    const surface = Skia.Surface.MakeOffscreen(PIXELS_WIDE, Math.round(image.height * scale));
    if (!surface) return Promise.reject(new Error('No off-screen surface'));
    const canvas = surface.getCanvas();
    canvas.scale(scale, scale);
    for (const node of toSkiaNodes(image.commands)) draw(canvas, node);
    surface.flush();
    const file = freshFile(`${name}.png`);
    file.writeSync(surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG, 100));
    return Promise.resolve(file.uri);
  },
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
