import type { Translate } from '../../i18n/i18n-provider';

import type { ReportSubject } from './report-model';

/** A report subject's name in the language. */
export function subjectName(subject: ReportSubject, t: Translate): string {
  switch (subject) {
    case 'paperwork':
      return t('reportCard.subject.paperwork');
    case 'home':
      return t('reportCard.subject.home');
    case 'calls':
      return t('reportCard.subject.calls');
    case 'health':
      return t('reportCard.subject.health');
    case 'errands':
      return t('reportCard.subject.errands');
    case 'study':
      return t('reportCard.subject.study');
    case 'work':
      return t('reportCard.subject.work');
    case 'other':
      return t('reportCard.subject.other');
  }
}

export function monthName(day: string, language: 'en' | 'vi'): string {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    month: 'long',
    timeZone: 'UTC',
  }).format(Date.parse(`${day}T12:00:00Z`));
}
