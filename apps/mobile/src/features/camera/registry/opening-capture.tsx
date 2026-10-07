import { lineWithNoTask } from '../../../state/lines';
import { composerShown, useCapture } from '../../one-screen/captures';
import { OneScreenView } from '../../one-screen/one-screen-view';

const nothing = () => undefined;

/** The one screen on a phone that can read a photo: the camera button sits beside the dock. */
export function OneScreenWithCamera() {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="waiting"
      attitude={voice.attitude}
      line={lineWithNoTask('waiting', voice)}
      offline={false}
      onWorld={nothing}
      shown={composerShown({ onCamera: nothing })}
    />
  );
}
