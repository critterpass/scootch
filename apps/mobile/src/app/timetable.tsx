import { TimetableScreen } from '../features/timetable/timetable-screen';

/**
 * The desk sheet swiped up: the timetable, with the desk's task kept at its top. It is laid over
 * the desk with nothing played by the system (`over` in `stack-transitions.ts`): its sheet is the
 * desk's sheet carried on from the swipe, and the classroom stays behind it under a scrim.
 */
export default function Timetable() {
  return <TimetableScreen />;
}
