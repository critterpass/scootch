import { View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { Panel } from './ui/parts';

export interface KeptRecord {
  readonly week: string;
  /** The record's own name, or the plain "Week n" when it has none. */
  readonly name: string;
  readonly bars: number;
}

/** The record shelf: every week's record that was kept, newest first. */
export function RecordShelf({
  records,
  close,
}: {
  readonly records: readonly KeptRecord[];
  readonly close: () => void;
}) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <KeepFrame
      testID="record-shelf"
      title={t('recordShelf.title')}
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: close }}
      closeTestID="record-shelf-close"
    >
      {records.length === 0 ? (
        <SessionText face="body" color={palette.muted} testID="record-shelf-empty">
          {t('recordShelf.empty')}
        </SessionText>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {records.map((record) => (
            <Panel key={record.week} testID={`record-shelf-${record.week}`}>
              <SessionText face="action" color={palette.ink}>
                {record.name}
              </SessionText>
              <SessionText face="caption" color={palette.muted}>
                {t('recordShelf.bars', { count: record.bars })}
              </SessionText>
            </Panel>
          ))}
        </View>
      )}
    </KeepFrame>
  );
}
