import { useT } from '../../i18n/i18n-provider';
import { Page } from '../settings/page';
import { Note, Row, Section } from '../settings/rows';

import { helplineLabel } from './crisis-view';
import { HELPLINES, type Helpline } from './helplines';

export interface HelplinesPageProps {
  /** The phone's region code. Its helplines are listed first. */
  readonly region: string | null;
  readonly onCall: (line: Helpline) => void;
  readonly onDirectory: () => void;
  readonly onClose: () => void;
}

const COUNTRY_KEYS = {
  US: 'care.country.us',
  CA: 'care.country.ca',
  GB: 'care.country.gbie',
  AU: 'care.country.au',
  NZ: 'care.country.nz',
  IN: 'care.country.in',
  VN: 'care.country.vn',
} as const;

/**
 * The helplines, one tap from Settings on every day. No critter and nothing funny: the person's
 * own region first, then the others, then the directory for anywhere else.
 */
export function HelplinesPage({ region, onCall, onDirectory, onClose }: HelplinesPageProps) {
  const t = useT();
  const code = region?.toUpperCase() ?? '';
  const ordered = [...HELPLINES].sort(
    (a, b) => Number(b.regions.includes(code)) - Number(a.regions.includes(code)),
  );
  return (
    <Page title={t('settings.helplines')} onClose={onClose} testID="helplines">
      {ordered.map((line) => {
        const first = line.regions[0] as keyof typeof COUNTRY_KEYS;
        return (
          <Section key={`${first}-${line.number}`} label={t(COUNTRY_KEYS[first])}>
            <Row
              first
              label={helplineLabel(t, line)}
              hint={t('care.helpline.hint')}
              onPress={() => onCall(line)}
              testID={`helpline-${first.toLowerCase()}`}
            />
          </Section>
        );
      })}
      <Section label={t('care.country.elsewhere')}>
        <Row
          first
          label={t('care.crisis.findHelpline')}
          hint={t('care.crisis.findHelpline.hint')}
          onPress={onDirectory}
          testID="helpline-directory"
        />
      </Section>
      <Note text={t('care.crisis.note')} />
    </Page>
  );
}
