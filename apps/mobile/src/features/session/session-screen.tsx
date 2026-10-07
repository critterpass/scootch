import { View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';

import { MomentScreen, TreatScreen } from './screens/after-screens';
import { BurstScreen } from './screens/burst-screen';
import { FinishScreen } from './screens/finish-screen';
import { NotFinishedScreen } from './screens/not-finished-screen';
import { ParkedThoughtsScreen } from './screens/parked-thoughts-screen';
import type { SessionActions, SessionModel } from './screens/screen-props';
import { WorkingScreen } from './screens/working-screen';
import { sessionInks } from './ui/session-inks';

export interface SessionScreenProps {
  readonly model: SessionModel;
  readonly actions: SessionActions;
}

/**
 * The session, whichever of its screens the model asks for. Everything shown comes in through the
 * model and everything pressed goes out through the actions, so the same screens serve the app
 * and the screen registry.
 */
export function SessionScreen({ model, actions }: SessionScreenProps) {
  const inks = sessionInks(useAppearance());
  const t = useT();
  const props = { model, actions, inks, t };
  switch (model.view.kind) {
    case 'home':
    case 'starting':
    case 'reveal':
      // Between screens: the page, and nothing on it.
      return <View style={{ flex: 1, backgroundColor: inks.page }} />;
    case 'burst':
      return <BurstScreen {...props} />;
    case 'working':
      return <WorkingScreen {...props} />;
    case 'finish':
    case 'caught':
      // The catch plays on the finish screen itself, which stays mounted from the finish into it.
      return <FinishScreen key={model.view.control} {...props} />;
    case 'not_finished':
      return <NotFinishedScreen {...props} />;
    case 'moment':
      return <MomentScreen {...props} />;
    case 'treat':
      return <TreatScreen {...props} />;
    case 'thoughts':
      return <ParkedThoughtsScreen {...props} />;
  }
}
