import { StyleSheet, View } from 'react-native';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';

import { ActionDock } from './action-dock';
import type { JoinOutcome } from './table-rules';
import { Words } from './words';

export type JoinProblem = Exclude<JoinOutcome, 'name_required' | 'not_signed_in' | 'plus_required'>;

const PROBLEMS = {
  link_ended: ['table.join.ended', 'table.join.ended.sub'],
  full: ['table.join.full', 'table.join.full.sub'],
  banned: ['table.join.banned', 'table.join.banned.sub'],
  unreachable: ['table.join.unreachable', 'table.join.unreachable.sub'],
} as const;

export interface JoinPageProps {
  /** `null` while the seat is being asked for. */
  readonly problem: JoinProblem | null;
  readonly onAgain: () => void;
  readonly onClose: () => void;
}

/** Asking for the seat an invite link points to, and the plain reasons it may not be given. */
export function JoinPage({ problem, onAgain, onClose }: JoinPageProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  const character = useCharacterMotion();
  // Scootch looks for the seat while it is asked for, and waits beside the plain reason after.
  const figure = largeText ? null : (
    <View
      style={styles.figure}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Scootch mood={problem === null ? 'thinking' : 'waiting'} {...character} size={200} />
    </View>
  );
  if (problem === null) {
    return (
      <Page onClose={onClose} testID="table-joining">
        {figure}
        <View style={styles.said}>
          <Words kind="headline">{t('table.join.seating')}</Words>
        </View>
      </Page>
    );
  }
  const [title, sub] = PROBLEMS[problem];
  const close = {
    label: t('settings.close'),
    hint: t('settings.close.hint'),
    onPress: onClose,
    testID: 'table-join-close',
  };
  return (
    <Page
      onClose={onClose}
      testID={`table-join-${problem}`}
      footer={
        problem === 'unreachable' ? (
          <ActionDock
            quiet={close}
            action={{
              label: t('table.join.again'),
              hint: t('table.join.again.hint'),
              onPress: onAgain,
              testID: 'table-join-again',
            }}
          />
        ) : (
          <ActionDock quiet={close} />
        )
      }
    >
      {figure}
      <View style={styles.said}>
        <Words kind="headline">{t(title)}</Words>
        <Words kind="quiet">{t(sub)}</Words>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  figure: { height: 260, alignItems: 'center', justifyContent: 'center' },
  said: { paddingHorizontal: 12, gap: 10 },
});
