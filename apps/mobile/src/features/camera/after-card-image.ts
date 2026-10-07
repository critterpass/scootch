import { ImageFormat, matchFont, Skia, type SkImage } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// The before-and-after card as one picture, for Photos or the share sheet. Nothing here is
// covered by the unit tests: it runs only in a native build. The two photos are read from the
// phone's own files and the picture is written to its cache; nothing is uploaded.

const WIDTH = 1080;
const PHOTO_HEIGHT = 1080;
const FOOT = 150;
const GAP = 6;
const PAGE = '#F4F1EA';
const INK = '#1C1A17';

export interface AfterCardWords {
  readonly title: string;
  readonly before: string;
  readonly after: string;
  /** The website's name, which every shared picture carries. */
  readonly site: string;
}

async function photo(uri: string): Promise<SkImage> {
  const bytes = await new File(uri).bytes();
  const image = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));
  if (image === null) throw new Error('The photo could not be read');
  return image;
}

/** The middle of a photo, cropped to fill a frame of this shape. */
function cropTo(image: SkImage, width: number, height: number) {
  const scale = Math.max(width / image.width(), height / image.height());
  const w = width / scale;
  const h = height / scale;
  return Skia.XYWHRect((image.width() - w) / 2, (image.height() - h) / 2, w, h);
}

/**
 * Draws the two photos side by side with their labels over them, and the title and the website
 * under them. Returns the address of the PNG it wrote.
 */
export async function renderAfterCard(
  beforeUri: string,
  afterUri: string,
  words: AfterCardWords,
): Promise<string> {
  const [before, after] = await Promise.all([photo(beforeUri), photo(afterUri)]);
  const surface = Skia.Surface.MakeOffscreen(WIDTH, PHOTO_HEIGHT + FOOT);
  if (!surface) throw new Error('No off-screen surface');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(PAGE));
  canvas.drawRect(Skia.XYWHRect(0, 0, WIDTH, PHOTO_HEIGHT + FOOT), paint);

  const half = (WIDTH - GAP) / 2;
  const picture = Skia.Paint();
  picture.setAntiAlias(true);
  canvas.drawImageRect(
    before,
    cropTo(before, half, PHOTO_HEIGHT),
    Skia.XYWHRect(0, 0, half, PHOTO_HEIGHT),
    picture,
  );
  canvas.drawImageRect(
    after,
    cropTo(after, half, PHOTO_HEIGHT),
    Skia.XYWHRect(half + GAP, 0, half, PHOTO_HEIGHT),
    picture,
  );

  const family = Platform.select({ ios: 'ui-rounded', default: 'sans-serif' });
  const labelFont = matchFont({ fontFamily: family, fontSize: 34, fontWeight: '600' });
  const label = (text: string, x: number) => {
    const width = labelFont.measureText(text).width;
    paint.setColor(Skia.Color('rgba(0,0,0,0.55)'));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, 28, width + 44, 60), 30, 30), paint);
    paint.setColor(Skia.Color('#FFFFFF'));
    canvas.drawText(text, x + 22, 70, paint, labelFont);
  };
  label(words.before, 28);
  label(words.after, half + GAP + 28);

  paint.setColor(Skia.Color(INK));
  const titleFont = matchFont({ fontFamily: family, fontSize: 48, fontWeight: '700' });
  canvas.drawText(words.title, 40, PHOTO_HEIGHT + 92, paint, titleFont);
  const siteFont = matchFont({ fontFamily: family, fontSize: 34, fontWeight: '500' });
  const siteWidth = siteFont.measureText(words.site).width;
  canvas.drawText(words.site, WIDTH - 40 - siteWidth, PHOTO_HEIGHT + 92, paint, siteFont);

  surface.flush();
  const file = new File(Paths.cache, 'before-and-after.png');
  if (file.exists) file.delete();
  file.create();
  file.writeSync(surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG, 100));
  return file.uri;
}
