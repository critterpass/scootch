import { KeepContainer } from '../features/keep/keep-container';

/** The keeping place, on the shelf: every caught monster and its card. */
export default function ZooRoute() {
  return <KeepContainer initial="caught" />;
}
