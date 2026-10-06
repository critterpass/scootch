/**
 * Helplines by country, shown first on a crisis day and kept one tap from Settings.
 *
 * EVERY NUMBER HERE MUST BE VERIFIED AGAINST ITS SOURCE BEFORE LAUNCH, and again every month after.
 * `checkedOn` is the day a person last did that; `null` means nobody has yet, and the app must not
 * ship while any row says so. The rows are the ones the design's helplines page lists. Nothing in
 * this file is ever logged.
 */
export interface Helpline {
  /** ISO 3166-1 alpha-2 codes of the regions this row is shown in. */
  readonly regions: readonly string[];
  /** The service's own name. Left as the service writes it, in every language. */
  readonly name: string;
  readonly number: string;
  /** `emergency` is the country's emergency number, shown where no helpline has been verified. */
  readonly reach: 'call' | 'call_or_text' | 'emergency';
  /** Where the number comes from and where to check it. */
  readonly source: string;
  /** `YYYY-MM-DD`, or `null` while the row is unverified. */
  readonly checkedOn: string | null;
}

/** A directory of free, confidential helplines in every country: the safe default. */
export const HELPLINE_DIRECTORY = 'https://findahelpline.com';

export const HELPLINES: readonly Helpline[] = [
  {
    regions: ['US'],
    name: 'Suicide & Crisis Lifeline',
    number: '988',
    reach: 'call_or_text',
    source: 'https://988lifeline.org',
    checkedOn: null,
  },
  {
    regions: ['CA'],
    name: '988 Suicide Crisis Helpline',
    number: '988',
    reach: 'call_or_text',
    source: 'https://988.ca',
    checkedOn: null,
  },
  {
    regions: ['GB', 'IE'],
    name: 'Samaritans',
    number: '116 123',
    reach: 'call',
    source: 'https://www.samaritans.org',
    checkedOn: null,
  },
  {
    regions: ['AU'],
    name: 'Lifeline',
    number: '13 11 14',
    reach: 'call',
    source: 'https://www.lifeline.org.au',
    checkedOn: null,
  },
  {
    regions: ['NZ'],
    name: 'Need to talk?',
    number: '1737',
    reach: 'call_or_text',
    source: 'https://1737.org.nz',
    checkedOn: null,
  },
  {
    regions: ['IN'],
    name: 'Tele-MANAS',
    number: '14416',
    reach: 'call',
    source: 'https://telemanas.mohfw.gov.in',
    checkedOn: null,
  },
  {
    // No Vietnamese helpline has been verified yet. Until the founder supplies one, Vietnam shows
    // the medical emergency number and the directory.
    regions: ['VN'],
    name: '',
    number: '115',
    reach: 'emergency',
    source: 'https://findahelpline.com',
    checkedOn: null,
  },
];

/** The rows for a region code as the phone reports it. An unknown region has none: the directory. */
export function helplinesFor(region: string | null | undefined): readonly Helpline[] {
  const code = region?.trim().toUpperCase();
  if (!code) return [];
  return HELPLINES.filter((line) => line.regions.includes(code));
}

/** The link that dials a helpline. */
export function dialLink(line: Pick<Helpline, 'number'>): string {
  return `tel:${line.number.replaceAll(' ', '')}`;
}
