import { ZONE_OFFSET_MINUTES, type Helpline } from './helpline-table';

const DAY_MINUTES = 24 * 60;

/** Minutes after midnight of an `HH:MM` time. */
export function minutesOf(time: string): number {
  const [hours = '', minutes = ''] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/**
 * Whether a line answers at an instant (milliseconds since the epoch). Its hours are read in the
 * line's own time zone, whatever zone the phone or the browser is in. Open from the opening
 * minute up to, and not including, the closing minute.
 */
export function isOpenAt(line: Pick<Helpline, 'hours'>, now: number): boolean {
  const { hours } = line;
  if (hours.kind === 'always') return true;
  const local = new Date(now + ZONE_OFFSET_MINUTES[hours.timeZone] * 60_000);
  const day = local.getUTCDay();
  const minute = (local.getUTCHours() * 60 + local.getUTCMinutes()) % DAY_MINUTES;
  return (
    hours.days.some((one) => one === day) &&
    minute >= minutesOf(hours.from) &&
    minute < minutesOf(hours.to)
  );
}

export interface HelplineNow {
  readonly line: Helpline;
  readonly open: boolean;
}

/**
 * The lines in the order they are shown at an instant: the emergency number, then the lines that
 * are open, then the ones that are closed. No line is ever left out, and lines keep the table's
 * order within each group.
 */
export function orderedAt(lines: readonly Helpline[], now: number): readonly HelplineNow[] {
  const rank = (one: HelplineNow) => (one.line.reach === 'emergency' ? 0 : one.open ? 1 : 2);
  return lines
    .map((line) => ({ line, open: isOpenAt(line, now) }))
    .sort((a, b) => rank(a) - rank(b));
}

const digitsOf = (number: string) => number.replace(/\D/g, '');

/** The link that dials a helpline: its digits and nothing else. */
export function dialLink(line: Pick<Helpline, 'number'>): string {
  return `tel:${digitsOf(line.number)}`;
}

/** The link that texts a helpline's own text number, or null when it has none. */
export function textLink(line: Pick<Helpline, 'textNumber'>): string | null {
  return line.textNumber === undefined ? null : `sms:${digitsOf(line.textNumber)}`;
}

/**
 * Everything in a table that nobody has verified at its source yet, one line each. Production
 * waits until this is empty.
 */
export function unverifiedHelplines(lines: readonly Helpline[]): string[] {
  const problems: string[] = [];
  for (const line of lines) {
    const who = `${line.regions.join('/')} ${line.number}${line.name === '' ? '' : ` (${line.name})`}`;
    if (line.checkedOn === null) problems.push(`${who}: the number is not verified`);
    if (line.hours.kind === 'weekly' && line.hours.checkedOn === null) {
      problems.push(`${who}: the opening hours are not verified`);
    }
  }
  return problems;
}
