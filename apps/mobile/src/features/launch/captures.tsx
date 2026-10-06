import { useLanguage } from '../../i18n/i18n-provider';
import { lineWithNoTask } from '../../state/lines';

import { AttitudeView } from './attitude-view';
import { HelloView, PermissionsView } from './launch-views';

// First launch's steps as the screen registry shows them: each view with fixed choices and no
// store behind it. The words still come from the offline pack, in the capture's language.

const nothing = () => undefined;

function useVoice() {
  const { language } = useLanguage();
  return { language, attitude: 'cheeky' } as const;
}

export function LaunchHello() {
  const voice = useVoice();
  return (
    <HelloView
      line={lineWithNoTask('hello', voice)}
      more={lineWithNoTask('about', voice)}
      attitude={voice.attitude}
      onSqueak={nothing}
      onNext={nothing}
    />
  );
}

export function LaunchAttitude() {
  const voice = useVoice();
  return (
    <AttitudeView
      line={lineWithNoTask('attitudeAsk', voice)}
      selected={voice.attitude}
      onChoose={nothing}
      onConfirm={nothing}
    />
  );
}

export function LaunchPermissions() {
  const voice = useVoice();
  return (
    <PermissionsView
      line={lineWithNoTask('favours', voice)}
      reasons={{
        notifications: lineWithNoTask('notificationsWhy', voice),
        microphone: lineWithNoTask('microphoneWhy', voice),
      }}
      attitude={voice.attitude}
      asking="notifications"
      accepted={[]}
      prompting={false}
      onAnswer={nothing}
    />
  );
}
