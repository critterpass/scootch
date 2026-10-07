import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { TableSeat } from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';

import { REPORT_REASONS, type ReportReason } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Note, Row, Section, SwitchRow } from '../settings/rows';

import { CritterAvatar } from './critter-avatar';
import { Words } from './words';

export interface SeatSheetProps {
  /** The seat the sheet is about; `null` keeps it closed. */
  readonly seat: TableSeat | null;
  readonly muted: boolean;
  /** Starts on the four reasons (a registry capture of the report step). */
  readonly reporting?: boolean;
  /** What the last action came to, said in one plain line. */
  readonly result: 'sent' | 'failed' | null;
  readonly onMute: (muted: boolean) => void;
  readonly onReport: (reason: ReportReason, alsoLeave: boolean) => void;
  readonly onBlock: () => void;
  readonly onLeave: () => void;
  readonly onClose: () => void;
}

/**
 * What a long press on a seat opens: mute their nudges, report, block, or leave. Nothing about
 * the other person is shown beyond their name and label, and they are never told.
 */
export function SeatSheet(props: SeatSheetProps) {
  const { seat, muted, result } = props;
  const t = useT();
  const { palette } = useScreenStyle();
  const [reporting, setReporting] = useState(props.reporting === true);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [alsoLeave, setAlsoLeave] = useState(false);
  const name = seat?.name ?? t('table.sheet.someone');
  const close = () => {
    setReporting(false);
    setReason(null);
    props.onClose();
  };

  return (
    <Modal visible={seat !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.close')}
        accessibilityHint={t('table.ok.hint')}
        onPress={close}
        style={styles.shade}
      />
      <View
        accessibilityViewIsModal
        testID="seat-sheet"
        style={[styles.sheet, { backgroundColor: palette.page }]}
      >
        <View style={[styles.grabber, { backgroundColor: `${palette.ink}33` }]} />
        <View style={styles.head}>
          {reporting || !seat ? null : <CritterAvatar seed={seat.userId} size={56} />}
          <Words kind="title" centred>
            {reporting ? t('table.report.title') : name}
          </Words>
          {reporting || !seat || seat.label === '' ? null : (
            <Words kind="quiet" centred>
              {seat.label}
            </Words>
          )}
        </View>
        {reporting ? (
          <>
            <Section>
              {REPORT_REASONS.map((one, index) => (
                <Row
                  key={one}
                  first={index === 0}
                  kind="choice"
                  selected={reason === one}
                  label={t(`table.report.${one}`)}
                  hint={t('table.report.reason.hint')}
                  onPress={() => setReason(one)}
                  testID={`report-${one}`}
                />
              ))}
              <SwitchRow
                label={t('table.report.alsoLeave')}
                hint={t('table.report.alsoLeave.hint')}
                value={alsoLeave}
                onChange={setAlsoLeave}
                testID="report-also-leave"
              />
            </Section>
            <CapsuleButton
              label={t('table.report.send')}
              hint={t('table.report.send.hint')}
              disabled={reason === null}
              onPress={() => reason !== null && props.onReport(reason, alsoLeave)}
              testID="report-send"
            />
          </>
        ) : (
          <Section>
            <Row
              first
              label={t(muted ? 'table.sheet.unmute' : 'table.sheet.mute', { name })}
              hint={t('table.sheet.mute.hint')}
              onPress={() => props.onMute(!muted)}
              testID="seat-mute"
            />
            <Row
              label={t('table.sheet.report')}
              sub={t('table.sheet.report.sub')}
              hint={t('table.sheet.report.hint')}
              onPress={() => setReporting(true)}
              testID="seat-report"
            />
            <Row
              label={t('table.sheet.block', { name })}
              sub={t('table.sheet.block.sub')}
              hint={t('table.sheet.block.hint')}
              onPress={props.onBlock}
              testID="seat-block"
            />
            <Row
              danger
              label={t('table.leave')}
              hint={t('table.leave.hint')}
              onPress={props.onLeave}
              testID="seat-leave"
            />
          </Section>
        )}
        {result === null ? (
          <Note text={t('table.sheet.note', { name })} testID="seat-note" />
        ) : (
          <Note
            text={t(result === 'sent' ? 'table.report.sent' : 'table.failed')}
            testID="seat-result"
          />
        )}
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
  head: { alignItems: 'center', gap: 4 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
});
