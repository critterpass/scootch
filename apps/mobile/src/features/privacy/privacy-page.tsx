import { Modal, StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note, Row, Section, SwitchRow } from '../settings/rows';
import { PressSpring } from '../../ui/motion/press-spring';

const DANGER = '#C8381B';

export interface PrivacyPageProps {
  readonly keepTranscripts: boolean;
  /** What the export or the delete last came to, said under the rows; `null` when nothing has. */
  readonly notice: string | null;
  /** The spare copy could not be kept because it is too large: said in one plain line. */
  readonly backupTooLarge?: boolean;
  /** The name this phone is signed in with for tables; absent when it never signed in. */
  readonly accountName?: string | null;
  /**
   * On a phone with the camera: whether Scootch asks before the words on a Paper or Screen photo
   * are sent to be read. Absent where there is no camera, and then no camera row is drawn.
   */
  readonly camera?: { readonly asks: boolean; readonly onAsks: (asks: boolean) => void };
  readonly onKeepTranscripts: (keep: boolean) => void;
  readonly onExport: () => void;
  readonly onAskDelete: () => void;
  /** Signs this phone out of the account; the row is drawn only with an account. */
  readonly onSignOut?: () => void;
  readonly onClose: () => void;
}

/**
 * Privacy and data, in plain answers: what happens to a ramble, that nothing is used to train
 * models, what a session tells the server, and the two things that are the person's to do: take their data, or delete all of it.
 * The camera rows are drawn only on a phone that has the camera.
 */
export function PrivacyPage(props: PrivacyPageProps) {
  const t = useT();
  return (
    <Page title={t('settings.privacyAndData')} onClose={props.onClose} testID="privacy">
      <Section label={t('privacy.voice')}>
        <Row
          first
          kind="fact"
          label={t('privacy.transcribed')}
          sub={t('privacy.transcribed.sub')}
          testID="privacy-transcribed"
        />
        <SwitchRow
          label={t('privacy.keepTranscripts')}
          sub={t(
            props.keepTranscripts ? 'privacy.keepTranscripts.on' : 'privacy.keepTranscripts.off',
          )}
          hint={t('privacy.keepTranscripts.hint')}
          value={props.keepTranscripts}
          onChange={props.onKeepTranscripts}
          testID="privacy-keep-transcripts"
        />
      </Section>
      <Section label={t(props.camera ? 'privacy.photosAndTasks' : 'privacy.tasks')}>
        {props.camera ? (
          <>
            <Row
              first
              kind="fact"
              label={t('privacy.camera.photos')}
              sub={t('privacy.camera.photos.sub')}
              testID="privacy-camera-photos"
            />
            <SwitchRow
              label={t('privacy.camera.ask')}
              sub={t(props.camera.asks ? 'privacy.camera.ask.on' : 'privacy.camera.ask.off')}
              hint={t('privacy.camera.ask.hint')}
              value={props.camera.asks}
              onChange={props.camera.onAsks}
              testID="privacy-camera-ask"
            />
          </>
        ) : null}
        <Row
          first={!props.camera}
          kind="fact"
          label={t('privacy.neverTrained')}
          value={t('privacy.always')}
          testID="privacy-never-trained"
        />
        <Row
          kind="fact"
          label={t('privacy.hunting')}
          sub={t('privacy.hunting.sub')}
          testID="privacy-hunting"
        />
      </Section>
      <Section label={t('privacy.yours')}>
        <Row
          first
          label={t('privacy.export')}
          hint={t('privacy.export.hint')}
          onPress={props.onExport}
          testID="privacy-export"
        />
        <Row
          danger
          label={t('settings.deleteEverything')}
          hint={t('privacy.delete.hint')}
          onPress={props.onAskDelete}
          testID="privacy-delete"
        />
      </Section>
      {props.accountName === undefined ? null : (
        <Section label={t('account.section')}>
          <Row
            first
            kind="fact"
            label={t('account.signedIn')}
            {...(props.accountName === null ? {} : { value: props.accountName })}
            testID="privacy-account"
          />
          {props.onSignOut === undefined ? null : (
            <Row
              label={t('account.signOut')}
              hint={t('account.signOut.hint')}
              onPress={props.onSignOut}
              testID="privacy-sign-out"
            />
          )}
          <Row
            danger
            label={t('account.delete')}
            hint={t('account.delete.hint')}
            onPress={props.onAskDelete}
            testID="privacy-delete-account"
          />
        </Section>
      )}
      {props.notice === null ? null : <Note text={props.notice} testID="privacy-notice" />}
      {props.backupTooLarge ? (
        <Note text={t('privacy.backup.tooLarge')} testID="privacy-backup-too-large" />
      ) : null}
    </Page>
  );
}

export interface DeleteSheetProps {
  readonly open: boolean;
  /** The newest caught monster's name, for the question; `null` asks it plainly. */
  readonly monsterName: string | null;
  readonly attitude: Attitude;
  readonly onKeep: () => void;
  readonly onDelete: () => void;
}

/**
 * The second step of deleting everything. It says exactly what goes, the big button is the safe
 * one, and it is honest that deleting data does not cancel Plus.
 */
export function DeleteSheet({ open, monsterName, attitude, onKeep, onDelete }: DeleteSheetProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onKeep}>
      <View style={styles.shade}>
        <View
          accessibilityViewIsModal
          testID="delete-sheet"
          style={[styles.sheet, { backgroundColor: palette.page }]}
        >
          {largeText || monsterName === null ? null : (
            <View
              style={styles.figure}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Scootch mood="bargaining" attitude={attitude} reducedMotion size={120} />
            </View>
          )}
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            style={[styles.title, { color: palette.ink, fontSize: size(24) }]}
          >
            {monsterName === null
              ? t('privacy.delete.title')
              : t('privacy.delete.titleEven', { name: monsterName })}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.body, { color: palette.muted, fontSize: size(17) }]}
          >
            {t('privacy.delete.body')}
          </Text>
          <CapsuleButton
            label={t('settings.keepEverything')}
            hint={t('privacy.keep.hint')}
            onPress={onKeep}
            testID="delete-keep"
          />
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteEverything')}
            accessibilityHint={t('privacy.delete.confirm.hint')}
            onPress={onDelete}
            testID="delete-confirm"
            style={styles.delete}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.deleteLabel, { color: DANGER, fontSize: size(17) }]}
            >
              {t('settings.deleteEverything')}
            </Text>
          </PressSpring>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.note, { color: palette.muted, fontSize: size(13) }]}
          >
            {t('privacy.delete.plus')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,26,23,0.28)' },
  sheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  figure: { alignItems: 'center' },
  title: { fontFamily: fonts.heading, fontWeight: '700', textAlign: 'center' },
  body: { fontFamily: fonts.body, textAlign: 'center' },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { fontFamily: fonts.heading, fontWeight: '700' },
  note: { fontFamily: fonts.body, textAlign: 'center' },
});
