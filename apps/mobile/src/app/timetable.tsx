import { TimetableScreen } from '../features/timetable/timetable-screen';

/**
 * The desk sheet swiped up: the timetable, with the desk's task kept at its top. It draws its own
 * arrival from the desk's swipe, so the stack plays nothing of its own.
 */
export default function Timetable() {
  return <TimetableScreen />;
}
