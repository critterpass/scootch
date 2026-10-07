import {
  HELPLINES,
  dialLink,
  helplineDetail,
  textLink,
  type Helpline,
  type Language,
} from '@scootch/i18n';

// The numbers, their hours and the dates they were verified live in `@scootch/i18n`, in the one
// table the app reads too. This file adds only what the page needs around a row: the country's
// name and the words on its links.

type Words = Readonly<Record<Language, string>>;

const COUNTRIES: Readonly<Record<string, Words>> = {
  US: { en: 'United States', vi: 'Hoa Kỳ' },
  CA: { en: 'Canada', vi: 'Canada' },
  GB: { en: 'United Kingdom and Ireland', vi: 'Vương quốc Anh và Ireland' },
  AU: { en: 'Australia', vi: 'Úc' },
  NZ: { en: 'New Zealand', vi: 'New Zealand' },
  IN: { en: 'India', vi: 'Ấn Độ' },
  VN: { en: 'Vietnam', vi: 'Việt Nam' },
};

const ACTIONS = {
  call: { en: 'Call {number}', vi: 'Gọi {number}' },
  call_or_text: { en: 'Call or text {number}', vi: 'Gọi hoặc nhắn tin tới {number}' },
  emergency: { en: 'Call {number}', vi: 'Gọi {number}' },
  text: { en: 'Text {number}', vi: 'Nhắn tin tới {number}' },
} as const satisfies Record<Helpline['reach'] | 'text', Words>;

export const VIETNAM = 'VN';

export interface HelplineRow {
  /** The row's place in the shared table: how the page finds it again when the clock moves. */
  readonly line: number;
  /** The first region of the row, which names its country block. */
  readonly region: string;
  readonly country: string;
  /** The service's name; empty for an emergency number, which the page names itself. */
  readonly name: string;
  readonly links: readonly { readonly href: string; readonly label: string }[];
  /** The words under the row while the line is open, and while it is closed. */
  readonly openDetail: string;
  readonly closedDetail: string;
}

/**
 * Every row of the table as the page shows it, a country at a time in the table's order. Within
 * a country the emergency number comes first; the page then moves closed lines last by the
 * reader's clock (`scripts/helplines-open-now`).
 */
export function helplineRows(language: Language): readonly HelplineRow[] {
  const regions = [...new Set(HELPLINES.map((line) => line.regions[0] ?? ''))];
  return regions.flatMap((region) => {
    const isEmergency = (line: Helpline) => Number(line.reach === 'emergency');
    const emergencyFirst = HELPLINES.filter((line) => line.regions[0] === region).sort(
      (a, b) => isEmergency(b) - isEmergency(a),
    );
    return emergencyFirst.map((line) => {
      const text = textLink(line);
      return {
        line: HELPLINES.indexOf(line),
        region,
        country: COUNTRIES[region]?.[language] ?? region,
        name: line.name,
        links: [
          {
            href: dialLink(line),
            label: ACTIONS[line.reach][language].replace('{number}', line.number),
          },
          ...(text === null
            ? []
            : [
                {
                  href: text,
                  label: ACTIONS.text[language].replace('{number}', line.textNumber ?? ''),
                },
              ]),
        ],
        openDetail: helplineDetail(language, line, true),
        closedDetail: helplineDetail(language, line, false),
      };
    });
  });
}

export const findAHelpline = {
  name: 'Find A Helpline',
  label: 'findahelpline.com',
  href: 'https://findahelpline.com',
} as const;
