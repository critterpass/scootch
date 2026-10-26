/**
 * The camera on the classroom: a rectangle of the room, its height set by the screen it fills.
 * The room has two compositions. `wide` is the Room board: the 1600 by 1000 room, seen whole (the
 * Duo's inner screen, sheets). `phone` is the App board's phone room: the same room with benches
 * and your paper in the foreground, 1100 tall, and its floor running on under the desk sheet, so
 * a phone's wide shots sit where the App board puts them.
 */

export type Composition = 'wide' | 'phone';

/** The camera: its top-left corner and width, in room units. Its height follows the screen. */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly w: number;
}
export interface View extends Camera {
  readonly h: number;
}
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** How far a camera may look: the room's width, and how far down there is still floor. */
export const WORLD: Readonly<
  Record<Composition, { readonly width: number; readonly height: number; readonly floorTo: number }>
> = {
  wide: { width: 1600, height: 1000, floorTo: 1000 },
  phone: { width: 1600, height: 1100, floorTo: 2100 },
};

/** The closest the camera goes: a little under a phone's width at one unit per point. */
export const MIN_CAMERA_WIDTH = 240;

// Worklets: the app also calls these on its UI thread, under a finger.
function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}
function finite(v: number, fallback: number): number {
  'worklet';
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Keeps the camera inside the room: never past the side walls or above the ceiling, never wider
 * than the room, never below the floor's end. A view taller than all of it sits on the ceiling.
 */
export function clampCamera(
  camera: Camera,
  viewport: Viewport,
  composition: Composition = 'wide',
): View {
  const world = WORLD[composition];
  const w = clamp(finite(camera.w, world.width), MIN_CAMERA_WIDTH, world.width);
  const h = (w * viewport.height) / viewport.width;
  return {
    x: clamp(finite(camera.x, 0), 0, world.width - w),
    y: clamp(finite(camera.y, 0), 0, Math.max(0, world.floorTo - h)),
    w,
    h,
  };
}

/**
 * The phone shots the brief names, as the App board's camera takes them on a 390-point phone:
 * its centre, its top and its scale (points per room unit). A wider phone sees more at the same
 * scale, about the same centre.
 */
export const PHONE_FRAMINGS = {
  /** Close on his desk, for deciding. */
  desk: { cx: 800, y: 0, scale: 1 },
  /** The whole room while you work. */
  session: { cx: 800, y: 40, scale: 0.5 },
  /** Further back at recess. */
  recess: { cx: 844.3, y: 10, scale: 0.42 },
  /** Where the first day starts; the camera pushes in to `desk` when you sit. */
  firstDay: { cx: 800, y: 40, scale: 0.5 },
} as const;
export type Framing = keyof typeof PHONE_FRAMINGS;
export const FRAMING_NAMES = Object.keys(PHONE_FRAMINGS) as readonly Framing[];

/** A named shot for a screen, before clamping. */
export function framing(name: Framing, viewport: Viewport): Camera {
  const f = PHONE_FRAMINGS[name];
  const w = viewport.width / f.scale;
  return { x: f.cx - w / 2, y: f.y, w };
}

/** The camera part of the way from one shot to another, for a scrubber. */
export function between(from: Camera, to: Camera, t: number): Camera {
  'worklet';
  const k = clamp(finite(t, 0), 0, 1);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    w: from.w + (to.w - from.w) * k,
  };
}
