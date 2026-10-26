import { DAY_FROM_HOUR, DAY_TO_HOUR, type SchoolDay } from './periods';

/**
 * The day dial's geometry, as `design/phus-class/Dial.dc.html` draws it: a 240-unit square, the
 * school day from seven to five laid round 300 degrees of a ring (thirty degrees an hour, with
 * the gap at the bottom), classes in slate, free periods in red, booked ones solid red, and the
 * time now as a knob on the ring.
 */
export const DIAL = {
  size: 240,
  centre: 120,
  ring: 94,
  stroke: 18,
  numbers: 73,
  face: 66,
  /** Degrees trimmed off each end of a period's arc, so neighbours read apart. */
  inset: 3.2,
  degreesPerHour: 30,
} as const;

/** The ring's angle for an hour of the day, clockwise from twelve o'clock. */
export function degreesAt(hour: number): number {
  return -150 + (hour - DAY_FROM_HOUR) * DIAL.degreesPerHour;
}

/** A point on a circle round the centre, at an angle clockwise from the top. */
export function pointAt(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: DIAL.centre + radius * Math.sin(radians),
    y: DIAL.centre - radius * Math.cos(radians),
  };
}

const fixed = (point: { x: number; y: number }) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

/** An SVG arc along the ring from one hour to another, trimmed by `inset` degrees each end. */
export function arcPath(fromHour: number, toHour: number, inset = 0, radius = DIAL.ring): string {
  const d1 = degreesAt(fromHour) + inset;
  const d2 = Math.max(d1 + 0.5, degreesAt(toHour) - inset);
  const large = d2 - d1 > 180 ? 1 : 0;
  return `M${fixed(pointAt(radius, d1))} A${radius} ${radius} 0 ${large} 1 ${fixed(pointAt(radius, d2))}`;
}

export type ArcKind = 'class' | 'free' | 'booked';

export interface DialArc {
  readonly key: string;
  readonly kind: ArcKind;
  readonly path: string;
  /** Over by now: drawn faint. */
  readonly past: boolean;
  /** A free period still to come: it breathes, unless motion is calmed. */
  readonly breathing: boolean;
}

const clampHour = (hour: number) => Math.min(DAY_TO_HOUR, Math.max(DAY_FROM_HOUR, hour));

/**
 * The day's arcs on the dial: every class and free period inside the school day, a booked free
 * period solid. Times outside seven to five are cut to the ring's ends; nothing is drawn for a
 * period wholly outside them.
 */
export function dialArcs(
  day: SchoolDay,
  booked: ReadonlySet<string>,
  nowMinutes: number | null,
): DialArc[] {
  const nowHour = nowMinutes === null ? null : nowMinutes / 60;
  return [...day.morning, ...day.afternoon]
    .map((period) => ({
      period,
      from: clampHour(period.start / 60),
      to: clampHour(period.end / 60),
    }))
    .filter(({ from, to }) => to > from)
    .map(({ period, from, to }) => {
      const kind: ArcKind =
        period.kind === 'class' ? 'class' : booked.has(period.id) ? 'booked' : 'free';
      const past = nowHour !== null && period.end / 60 <= nowHour;
      return {
        key: period.id,
        kind,
        path: arcPath(from, to, DIAL.inset),
        past,
        breathing: kind === 'free' && !past,
      };
    });
}

/** The knob for the time now, held to the ring's ends outside the school day. */
export function knobAt(nowMinutes: number): { x: number; y: number } {
  return pointAt(DIAL.ring, degreesAt(clampHour(nowMinutes / 60)));
}

/** The hour numbers inside the ring: 8, 12 and 16. */
export function dialNumbers(): { hour: number; x: number; y: number }[] {
  return [8, 12, 16].map((hour) => ({ hour, ...pointAt(DIAL.numbers, degreesAt(hour)) }));
}

/** How many free periods are still to come, for the caption under the dial. */
export function freeAhead(day: SchoolDay, nowMinutes: number | null): number {
  return day.free.filter((period) => nowMinutes === null || period.end > nowMinutes).length;
}
