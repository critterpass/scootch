import { DUO, type FoldLayout } from './fold-layout';

/**
 * Screens laid out as a phone's that would put a control in the top trailing corner, where iPhone
 * Duo keeps its own time and status running down the edge (a tap there opens Control Center).
 * On the Duo they are drawn clear of that column. The desk, the period and the board's screen
 * have Duo layouts of their own; the timetable keeps its own close clear; the first day is the
 * classroom, its controls in the sheet; the developer group holds the registry's captures, which
 * must be drawn as the screen they capture.
 */
const CLEARED: ReadonlySet<string> = new Set([
  'settings',
  'settings/name',
  'settings/quiet-hours',
  'tuition/index',
  'tuition/scholarship',
  'report-card',
  'share/[id]',
  'care/crisis',
  'care/serious',
  'care/helplines',
]);

/** How far a route's content keeps in from the trailing edge, in points: 0 but on the Duo. */
export function statusClear(routeName: string, layout: FoldLayout): number {
  return layout.controls === 'trailing' && CLEARED.has(routeName) ? DUO.column : 0;
}
