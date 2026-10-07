import { StyleSheet, View } from 'react-native';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { onInkOf } from '../../ui/buttons';
import { TableIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note, Row, Section } from '../settings/rows';

import { ActionDock } from './action-dock';
import { Words } from './words';

export interface InvitePageProps {
  /** Who made the link; `null` when the server names nobody, or could not be asked. */
  readonly hostName: string | null;
  /** The host's one or two words, as the server wrote them; `null` when hidden or unknown. */
  readonly hostLabel: string | null;
  /** The person's own set task, in their own words on their own phone; `null` with none set. */
  readonly taskText: string | null;
  readonly busy: boolean;
  readonly onSit: () => void;
  readonly onNotNow: () => void;
  readonly onClose: () => void;
}

/**
 * A friend's link, opened: who saved the seat, what the person is bringing, and the one tap that
 * sits down. Nothing is joined until that tap, and the friend's task is never shown: only the
 * word the table shows everyone.
 */
export function InvitePage(props: InvitePageProps) {
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  const { hostName, hostLabel, taskText } = props;
  return (
    <Page
      onClose={props.onClose}
      testID="table-invite-landing"
      footer={
        <ActionDock
          quiet={{
            label: t('haunt.notNow'),
            hint: t('table.landing.notNow.hint'),
            onPress: props.onNotNow,
            testID: 'table-landing-not-now',
          }}
          action={{
            label: t('table.sitDown'),
            hint: t('table.sitDown.hint'),
            icon: <TableIcon color={onInkOf(palette)} />,
            disabled: props.busy,
            onPress: props.onSit,
            testID: 'table-landing-sit',
          }}
        />
      }
    >
      {largeText ? null : (
        <View
          style={styles.figure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Scootch mood="working" workMode={null} ownLoop={false} reducedMotion size={136} />
          <View style={[styles.emptySeat, { borderColor: `${palette.ink}40` }]} />
        </View>
      )}
      <Words kind="headline" centred>
        {hostName === null
          ? t('table.landing.titleNoName')
          : t('table.landing.title', { name: hostName })}
      </Words>
      <Words kind="quiet" centred>
        {hostName !== null && hostLabel !== null
          ? t('table.landing.doing', { name: hostName, label: hostLabel })
          : t('table.landing.sub')}
      </Words>
      <Section label={t('table.landing.yours')}>
        <Row
          first
          kind="fact"
          label={taskText ?? t('table.landing.noTask')}
          {...(taskText === null ? {} : { sub: t('table.landing.private') })}
          testID="table-landing-task"
        />
      </Section>
      <Note text={t('table.landing.note')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  figure: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  emptySeat: {
    width: 62,
    height: 46,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1.5,
    marginBottom: 18,
    marginLeft: -6,
  },
});
