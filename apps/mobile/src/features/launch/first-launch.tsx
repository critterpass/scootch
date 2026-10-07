import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';

import type { Attitude } from '@scootch/domain';

import { trace } from '../../trace-temp';
import { useLanguage } from '../../i18n/i18n-provider';
import { useCue, useDispatch } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';
import type { SpeechPort } from '../composer/speech';

import { AttitudeView } from './attitude-view';
import {
  askAccepted,
  finishedLaunchSettings,
  LAUNCH_START,
  launchReducer,
  type LaunchEvent,
  type LaunchOutcome,
  type LaunchPermissions,
} from './launch-machine';
import { HelloView, PermissionsView } from './launch-views';

export interface FirstLaunchProps {
  readonly speech: SpeechPort;
  /** Called once first launch is finished and stored. */
  readonly onDone: (outcome: LaunchOutcome) => void;
}

/**
 * First launch, shown once: hello, the attitude, and the two favours asked in character before
 * the system asks. Its choices go to the settings through the day store, and from then on the
 * app opens on the one screen.
 */
export function FirstLaunch({ speech, onDone }: FirstLaunchProps) {
  const { language } = useLanguage();
  const dispatch = useDispatch();
  const playCue = useCue();
  const [state, setState] = useState(LAUNCH_START);
  trace(`render FirstLaunch ${state.step}`);
  const voice = { language, attitude: state.attitude };

  const finish = useCallback(
    async (attitude: Attitude, outcome: LaunchOutcome) => {
      // The outcome is handed over first, so the one screen opens already knowing it.
      onDone(outcome);
      await dispatch({
        type: 'settings_changed',
        changes: finishedLaunchSettings({ attitude }, Date.now()),
      }).catch(() => undefined);
    },
    [dispatch, onDone],
  );

  const send = (event: LaunchEvent) => {
    trace(`send ${event.type} from ${state.step}`);
    const next = launchReducer(state, event);
    trace(`next ${next.step}`);
    setState(next);
    if (next.step === state.step) return;
    if (next.step === 'finished') {
      void finish(next.attitude, { notifications: 'skipped', microphone: 'skipped' });
    }
    if (next.step === 'prompting') {
      const permissions: LaunchPermissions = {
        askNotifications: async () => (await Notifications.requestPermissionsAsync()).granted,
        askMicrophone: async () => (await speech.ask(language)) !== 'refused',
      };
      void askAccepted(next.accepted, permissions).then((outcome) => {
        setState((current) => launchReducer(current, { type: 'prompts_answered' }));
        return finish(next.attitude, outcome);
      });
    }
  };

  if (state.step === 'hello') {
    return (
      <HelloView
        line={lineWithNoTask('hello', voice)}
        more={lineWithNoTask('about', voice)}
        attitude={state.attitude}
        onSqueak={() => playCue('squeak')}
        onNext={() => send({ type: 'greeted' })}
      />
    );
  }
  if (state.step === 'attitude') {
    return (
      <AttitudeView
        line={lineWithNoTask('attitudeAsk', voice)}
        selected={state.attitude}
        onChoose={(attitude) => send({ type: 'attitude_chosen', attitude })}
        onConfirm={() => send({ type: 'attitude_confirmed' })}
      />
    );
  }
  return (
    <PermissionsView
      line={lineWithNoTask('favours', voice)}
      reasons={{
        notifications: lineWithNoTask('notificationsWhy', voice),
        microphone: lineWithNoTask('microphoneWhy', voice),
      }}
      attitude={state.attitude}
      asking={state.asking}
      accepted={state.accepted}
      prompting={state.step !== 'permissions'}
      onAnswer={(accepted) => send({ type: 'favour_answered', accepted })}
    />
  );
}
