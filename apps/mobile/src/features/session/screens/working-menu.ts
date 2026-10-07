import { DEVELOPER_END } from '../dev/short-session';
import type { SessionMenuItem } from '../ui/session-menu';

import type { ScreenProps } from './screen-props';

/**
 * What the corner menu of a running session holds, in order: help first, then finishing, then
 * stopping. Each is the action it always was; only where it lives has changed.
 */
export function workingMenu({ model, actions, t }: ScreenProps): SessionMenuItem[] {
  const stuck = model.view.kind === 'working' && model.view.stuck;
  const items: SessionMenuItem[] = [
    // Help is already on the screen once it has been asked for.
    ...(stuck
      ? []
      : [
          {
            label: t('session.stuck'),
            hint: t('session.stuck.hint'),
            testID: 'session-stuck',
            onPress: () => actions.send({ type: 'stuck_tapped' }),
          },
        ]),
    {
      label: t('session.finishEarly'),
      hint: t('session.finishEarly.hint'),
      testID: 'session-finish-early',
      onPress: actions.finishEarly,
    },
    {
      label: t('session.notFinished'),
      hint: t('session.notFinished.hint'),
      testID: 'session-leave',
      onPress: actions.leaveNow,
    },
  ];
  if (model.developerEnd) {
    items.push({
      label: DEVELOPER_END.label,
      hint: DEVELOPER_END.hint,
      testID: 'session-developer-end',
      onPress: actions.developerEnd,
    });
  }
  return items;
}
