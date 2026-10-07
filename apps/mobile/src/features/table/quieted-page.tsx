import type { Quieted } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { Page } from '../settings/page';
import { Note, Row, Section } from '../settings/rows';

import { CritterAvatar } from './critter-avatar';
import { Words } from './words';

export interface QuietedPageProps {
  /** `undefined` until the lists have been read. */
  readonly muted: readonly Quieted[] | undefined;
  readonly blocked: readonly Quieted[] | undefined;
  readonly failed: boolean;
  readonly onUnmute: (accountId: string) => void;
  readonly onUnblock: (accountId: string) => void;
  readonly onClose: () => void;
}

/**
 * The people the person muted, and the people they blocked, each with the one tap that undoes
 * it. Nobody on either list was told, and nobody is told when they come off it.
 */
export function QuietedPage(props: QuietedPageProps) {
  const t = useT();
  const { muted, blocked } = props;
  const group = (
    label: string,
    people: readonly Quieted[],
    undo: string,
    onUndo: (accountId: string) => void,
    testPrefix: string,
  ) =>
    people.length === 0 ? null : (
      <Section label={label}>
        {people.map((person, index) => (
          <Row
            key={person.accountId}
            first={index === 0}
            leading={<CritterAvatar seed={person.accountId} />}
            label={person.displayName ?? t('friends.noName')}
            value={undo}
            hint={t('settings.tables.quieted.undo.hint')}
            onPress={() => onUndo(person.accountId)}
            testID={`${testPrefix}-${person.accountId}`}
          />
        ))}
      </Section>
    );
  return (
    <Page title={t('settings.tables.quieted')} onClose={props.onClose} testID="table-quieted">
      {muted === undefined || blocked === undefined ? null : muted.length + blocked.length === 0 ? (
        <Words kind="quiet" testID="table-quieted-empty">
          {t('settings.tables.quieted.empty')}
        </Words>
      ) : (
        <>
          {group(
            t('settings.tables.muted'),
            muted,
            t('settings.tables.unmute'),
            props.onUnmute,
            'unmute',
          )}
          {group(
            t('settings.tables.blocked'),
            blocked,
            t('settings.tables.unblock'),
            props.onUnblock,
            'unblock',
          )}
          <Note text={t('settings.tables.quieted.note')} />
        </>
      )}
      {props.failed ? <Note text={t('table.failed')} testID="table-quieted-failed" /> : null}
    </Page>
  );
}
