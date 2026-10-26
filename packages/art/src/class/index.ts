/**
 * The classroom: Thầy Phú, his props and the room, drawn from the Phu, Prop and Room boards.
 *
 * How it is drawn, and why. The boards are SVG, and their look depends on things the package's
 * own `DrawCommand` list does not have: cubic curves, arcs, ellipses, clip paths and group
 * opacity. Converting them would mean approximating every curve. So the board markup is kept
 * verbatim (`*-template.ts`), and a pose or a room is that markup with its holes filled, cut
 * into layers (`figure.ts`):
 *
 * - still parts stay SVG markup, which the app draws with Skia's SVG module (`Skia.SVG` and
 *   `ImageSVG`), and node draws with the same module through @napi-rs/canvas, so the sheets show
 *   what the phone will;
 * - every part that moves on its own is a layer with an id, its placement matrix, a pivot and the
 *   name of its loop (`motion.ts`): his feet, body, head, brows, eyes (the blink swaps them),
 *   mouth, mustache, the ruler and its tap, the cup and its steam, the waving hand, the steam
 *   puffs, the fan, the clock hand, his place while pacing, and the props' legs, tail, flames,
 *   glows, drip, wings and steam. The app animates a layer with a Skia group transform and never
 *   redraws the rest;
 * - a pose change is a new set of layers for the same ids, so the app can swap or crossfade them;
 * - text (chalk lines, the door plate, the banner, carved initials) is never left in the SVG:
 *   Skia's SVG module cannot reach a font the app loads, so text is its own piece, drawn with the
 *   handwriting font.
 *
 * Copy here is the boards' own sample copy and only appears where a caller passes nothing; the
 * app passes its words from the voice package.
 */
export {
  addCarving,
  carvingSpot,
  carvingsLayer,
  CARVING_KINDS,
  RARE_CARVINGS,
  YOUR_DESK,
  type Carving,
  type CarvingKind,
  type CarvingSpot,
} from './carvings';
export {
  findLayer,
  layers,
  placed,
  toSvg,
  type Figure,
  type FontRole,
  type Layer,
  type Piece,
  type TextItem,
} from './figure';
export { applyMatrix, multiply, type Matrix, type Point } from './markup';
export {
  CHALK_THROW,
  CURVES,
  LOOPS,
  TIMING,
  type Curve,
  type Keyframe,
  type Loop,
  type LoopName,
} from './motion';
export { sampleLoop } from './loop-sample';
export {
  blinking,
  buildPhu,
  canBlink,
  isPhuMood,
  phuPose,
  PHU_MOODS,
  pressureMood,
  PRESSURE_MOODS,
  type Arms,
  type Glasses,
  type Lens,
  type Lid,
  type Mouth,
  type PhuEffect,
  type PhuMood,
  type PhuPose,
} from './phu';
export { PHU_SIZE } from './phu-template';
export { buildProp, isPropName, PROP_NAMES, type PropName } from './props';
export {
  between,
  clampCamera,
  framing,
  FRAMING_NAMES,
  MIN_CAMERA_WIDTH,
  PHONE_FRAMINGS,
  WORLD,
  type Camera,
  type Composition,
  type Framing,
  type View,
  type Viewport,
} from './camera';
export {
  phuInRoom,
  PHU_ROOM_SIZE,
  PHU_SPOTS,
  PROP_SPOTS,
  room,
  ROOM_FLOOR,
  ROOM_SIZE,
  type PlacedProp,
  type Room,
  type RoomOptions,
} from './room';
