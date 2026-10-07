import { useLanguage, useT } from '../../i18n/i18n-provider';
import { Page } from '../settings/page';
import { Note, Row, Section } from '../settings/rows';

import {
  HELPLINES,
  helplineDetail,
  helplineLabel,
  orderedAt,
  textLabel,
  type Helpline,
} from './helplines';

export interface HelplinesPageProps {
  /** The phone's region code. Its helplines are listed first. */
  readonly region: string | null;
  /** The time right now, from the clock. Decides which lines are open and their order. */
  readonly now: number;
  readonly onCall: (line: Helpline) => void;
  /** Texts a line's own text number. */
  readonly onTextLine: (line: Helpline) => void;
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
type Country = keyof typeof COUNTRY_KEYS;

/** The table's countries in its own order, each with its lines; the phone's own country first. */
function countriesFor(region: string): readonly (readonly [Country, readonly Helpline[]])[] {
  const byCountry = new Map<Country, Helpline[]>();
  for (const line of HELPLINES) {
    const country = line.regions[0] as Country;
    byCountry.set(country, [...(byCountry.get(country) ?? []), line]);
  }
  const isHome = (lines: readonly Helpline[]) =>
    lines.some((line) => line.regions.includes(region));
  return [...byCountry].sort((a, b) => Number(isHome(b[1])) - Number(isHome(a[1])));
}

/**
 * The helplines, one tap from Settings on every day. No critter and nothing funny: the person's
 * own region first, then the others, then the directory for anywhere else. Within a country the
 * emergency number comes first, then the lines that are open, then the closed ones, which say so
 * and can still be called.
 */
export function HelplinesPage({
  region,
  now,
  onCall,
  onTextLine,
  onDirectory,
  onClose,
}: HelplinesPageProps) {
  const t = useT();
  const { language } = useLanguage();
  return (
    <Page title={t('settings.helplines')} onClose={onClose} testID="helplines">
      {countriesFor(region?.toUpperCase() ?? '').map(([country, lines]) => (
        <Section key={country} label={t(COUNTRY_KEYS[country])}>
          {orderedAt(lines, now).flatMap(({ line, open }, index) => {
            const id = `helpline-${country.toLowerCase()}`;
            const digits = line.number.replaceAll(' ', '');
            const text = textLabel(t, line);
            const call = (
              <Row
                key={digits}
                first={index === 0}
                label={helplineLabel(t, line)}
                sub={helplineDetail(language, line, open)}
                hint={t('care.helpline.hint')}
                onPress={() => onCall(line)}
                testID={lines.length === 1 ? id : `${id}-${digits}`}
              />
            );
            if (text === null) return [call];
            return [
              call,
              <Row
                key={`${digits}-text`}
                label={text}
                hint={t('care.helpline.text.hint')}
                onPress={() => onTextLine(line)}
                testID={`${id}-text`}
              />,
            ];
          })}
        </Section>
      ))}
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
