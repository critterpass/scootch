import { useRouter } from 'expo-router';

import { useDispatch, useToday } from '../../state/day-store-provider';
import { showsSelling } from '../../state/shows-comedy';
import { goBack } from '../../ui/motion/go-back';
import { STUDIO_ROUTE } from '../plus/routes';

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
  const day = useToday();
  // An icon in a finish that is not worn yet is the studio's to offer. The picker itself sells
  // nothing, and on a day with something heavy in it the way to the studio rests.
  const studioDoor = {
    openStudio: () => router.push(STUDIO_ROUTE),
  };
  const studio: { readonly openStudio?: () => void } = showsSelling(day) ? studioDoor : {};
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
        if (!mayShow(picked)) return studio.openStudio?.();
        return change({
          type: 'settings_changed',
          changes: { iconFollows: 'pinned', iconPinned: picked },
        });
      }}
      onClose={() => goBack(router, '/settings')}
    />
  );
}
