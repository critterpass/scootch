import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import type { SellingDay } from '../../state/shows-comedy';
import { useScreenStyle } from '../../ui/use-screen-style';

import { CompanyControl, type Company } from './company-control';
import { showsTableEntry } from './table-rules';

const NOTE_SIZE = 13;

export interface TaskSetCompanyProps {
  readonly day: SellingDay;
  readonly company: Company;
  readonly onCompany: (company: Company) => void;
}

/**
 * Company as a choice on the set task, right under its length: alone, or at a table. With a table
 * chosen, one line says what the table is shown. On a heavy day, or beside a serious task, none
 * of it is drawn and the task starts alone.
 */
export function TaskSetCompany({ day, company, onCompany }: TaskSetCompanyProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  if (!showsTableEntry(day)) return null;
  return (
    <View style={styles.company}>
      <CompanyControl company={company} onCompany={onCompany} />
      {company === 'table' ? (
        <Text
          testID="task-set-company-note"
          allowFontScaling={allowFontScaling}
          style={[styles.note, { color: palette.muted, fontSize: size(NOTE_SIZE) }]}
        >
          {t('table.company.note')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  company: { gap: 10 },
  note: { fontFamily: fonts.body, marginHorizontal: 14, lineHeight: 18 },
});
