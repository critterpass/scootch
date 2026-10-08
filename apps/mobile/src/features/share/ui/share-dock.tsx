import { StyleSheet } from 'react-native';

import { useT } from '../../../i18n/i18n-provider';
import { CapsuleButton, GlassDock } from '../../../ui/buttons';
import { useScreenStyle } from '../../../ui/use-screen-style';

export interface ShareDockProps {
  readonly onShare: () => void;
  readonly onSave: () => void;
  /** Copies the link to the catch's page. Unset where there is no page to link to. */
  readonly onLink?: () => void;
  /** Sends the week's clip as a sound file. Unset for anything but a week's song. */
  readonly onSound?: () => void;
}

/**
 * Where the picture goes, in the one dock at the composer's foot: the quiet ways (Photos, a link
 * to copy, the week's sound) and, last and widest, the share sheet in ink, as the action is in
 * every dock. At the large text sizes they stack.
 */
export function ShareDock({ onShare, onSave, onLink, onSound }: ShareDockProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  const quiet = largeText ? styles.tight : [styles.tight, styles.quiet];
  return (
    <GlassDock style={largeText ? styles.stack : styles.row} testID="share-dock">
      <CapsuleButton
        tone="quiet"
        label={t('share.save')}
        hint={t('share.save.hint')}
        onPress={onSave}
        testID="share-save"
        style={quiet}
      />
      {onLink ? (
        <CapsuleButton
          tone="quiet"
          label={t('share.link')}
          hint={t('share.link.hint')}
          onPress={onLink}
          testID="share-link"
          style={quiet}
        />
      ) : null}
      {onSound ? (
        <CapsuleButton
          tone="quiet"
          label={t('share.sound')}
          hint={t('share.sound.hint')}
          onPress={onSound}
          testID="share-sound"
          style={quiet}
        />
      ) : null}
      <CapsuleButton
        label={t('share.share')}
        hint={t('share.share.hint')}
        onPress={onShare}
        testID="share-send"
        style={largeText ? styles.tight : [styles.tight, styles.action]}
      />
    </GlassDock>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  stack: { gap: 6 },
  // Three capsules share the dock: each keeps a narrower margin so a label stays on one line.
  tight: { paddingHorizontal: 12 },
  quiet: { flexGrow: 1, flexBasis: 0 },
  action: { flexGrow: 1.5, flexBasis: 0 },
});
