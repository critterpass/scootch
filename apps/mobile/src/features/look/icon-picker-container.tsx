import { useRouter } from 'expo-router';

import { useDispatch } from '../../state/day-store-provider';
import { goBack } from '../../ui/motion/go-back';

import { IconPickerPage } from './icon-picker-page';
import { useAppIcon } from './use-app-icon';

/**
 * The icon picker on the real phone. Each choice is one settings change; the icon itself follows
 * from the settings (`AppIconHost`), which is where iOS is asked.
 */
export function IconPickerContainer() {
  const { icon, follows, iconOf, mayShow } = useAppIcon();
  const dispatch = useDispatch();
  const router = useRouter();
  const change = (changes: Parameters<typeof dispatch>[0] & { type: 'settings_changed' }) =>
    void dispatch(changes).catch(() => undefined);
  return (
    <IconPickerPage
      icon={icon}
      follows={follows}
      iconOf={iconOf}
      mayShow={mayShow}
      onFollow={(iconFollows) => change({ type: 'settings_changed', changes: { iconFollows } })}
      onPick={(picked) => {
        // A finish that is not worn yet is the studio's to offer.
        if (!mayShow(picked)) return router.push('/studio');
        return change({
          type: 'settings_changed',
          changes: { iconFollows: 'pinned', iconPinned: picked },
        });
      }}
      onClose={() => goBack(router, '/settings')}
    />
  );
}
