import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Note, Row, Section, SwitchRow } from '../settings/rows';

import { Words } from './words';

export interface TableMenuSheetProps {
  readonly open: boolean;
  /** Who is here, in a few plain words, under the sheet's title. */
  readonly summary: string;
  readonly hidden: boolean;
  readonly nudgesMuted: boolean;
  /** Unset when every seat is taken: there is nobody to invite to. */
  readonly onInvite?: (() => void) | undefined;
  readonly onHidden: (hidden: boolean) => void;
  readonly onMuteNudges: (muted: boolean) => void;
  readonly onLeave: () => void;
  readonly onClose: () => void;
}

/**
 * Everything about this table, behind its ··· button: hiding the label, muting nudges here,
 * inviting a friend, and leaving. Leaving and hiding are as easy as staying.
 */
export function TableMenuSheet(props: TableMenuSheetProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <Modal visible={props.open} transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.close')}
        accessibilityHint={t('table.ok.hint')}
        onPress={props.onClose}
        style={styles.shade}
      />
      <View
        accessibilityViewIsModal
        testID="table-menu"
        style={[styles.sheet, { backgroundColor: palette.page }]}
      >
        <View style={[styles.grabber, { backgroundColor: `${palette.ink}33` }]} />
        <View style={styles.head}>
          <Words kind="title" centred>
            {t('table.title')}
          </Words>
          <Words kind="quiet" centred>
            {props.summary}
          </Words>
        </View>
        <Section>
          <SwitchRow
            first
            label={t('table.menu.hide')}
            sub={t('table.menu.hide.sub')}
            hint={t('table.showLabel.hint')}
            value={props.hidden}
            onChange={props.onHidden}
            testID="table-menu-hide"
          />
          <SwitchRow
            label={t('table.menu.mute')}
            sub={t('table.menu.mute.sub')}
            hint={t('table.menu.mute.hint')}
            value={props.nudgesMuted}
            onChange={props.onMuteNudges}
            testID="table-menu-mute"
          />
          {props.onInvite === undefined ? null : (
            <Row
              label={t('table.invite')}
              hint={t('table.invite.hint')}
              onPress={props.onInvite}
              testID="table-menu-invite"
            />
          )}
        </Section>
        <Section>
          <Row
            first
            danger
            label={t('table.leave')}
            hint={t('table.leave.hint')}
            onPress={props.onLeave}
            testID="table-menu-leave"
          />
        </Section>
        <Note text={t('table.menu.leave.note')} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: 'rgba(28,26,23,0.28)' },
  sheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  head: { gap: 2 },
});
