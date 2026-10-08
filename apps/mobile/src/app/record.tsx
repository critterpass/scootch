import { KeepContainer } from '../features/keep/keep-container';

/** The keeping place, on this week's record: its bars, its liner notes and the play control. */
export default function RecordRoute() {
  return <KeepContainer initial="song" />;
}
