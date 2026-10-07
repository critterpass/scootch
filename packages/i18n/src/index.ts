// String catalogues for English and Vietnamese.
export { languages } from './catalogue-types';
export type { Language, ParamsOf, StringKey } from './catalogue-types';
export { defaultLanguage, isLanguage, pickLanguage } from './pick-language';
export { t } from './translate';
export {
  dialLink,
  isOpenAt,
  orderedAt,
  textLink,
  unverifiedHelplines,
  type HelplineNow,
} from './helplines/helpline-rules';
export { HELPLINES, HELPLINE_DIRECTORY, helplinesFor } from './helplines/helpline-table';
export type { Helpline, HelplineHours, Weekday } from './helplines/helpline-table';
export { helplineDetail, hoursWords } from './helplines/helpline-words';
