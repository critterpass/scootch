import type { Carving as DrawnCarving } from '@phusclass/art/class';
import type { Carving } from '@phusclass/domain/board';
import type { Language } from '@phusclass/i18n';

import type { Translate } from '../../i18n/i18n-provider';

import type { ChalkModel } from './desk-model';

/** The user's initials for a carving: "Trần Minh Anh" carves "M.A". */
export function initialsOf(name: string | null): string | null {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const given = parts.slice(-2);
  return given.map((part) => part.charAt(0).toLocaleUpperCase('vi')).join('.');
}

/** Every mark the desk carries, as the classroom draws them. */
export function drawnCarvings(carvings: readonly Carving[], name: string | null): DrawnCarving[] {
  const initials = initialsOf(name);
  return carvings.map((carving): DrawnCarving => {
    switch (carving.kind) {
      case 'initials':
        return initials === null ? { kind: 'mark' } : { kind: 'initials', text: initials };
      case 'star':
        return { kind: 'star' };
      case 'heart':
      case 'flower':
        return { kind: 'heart' };
      case 'tiny phu':
        return { kind: 'phu' };
      case 'arrow':
        return { kind: 'mark' };
      case 'gold star':
        return { kind: 'goldStar' };
      case 'carved ten':
        return { kind: 'ten' };
    }
  });
}

/** The day at the top of the chalkboard: "Monday 26", "Thứ Hai, 26". */
export function chalkDate(at: number, language: Language): string {
  try {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
    }).format(at);
  } catch {
    return '';
  }
}

/** The chalk lines and the line under them, in the app's language. */
export function chalkWords(
  chalk: ChalkModel,
  t: Translate,
): { readonly chalk: string[]; readonly more: string } {
  if (chalk.main === null) return { chalk: [t('chalk.nothingYet')], more: t('chalk.tellHim') };
  const main = chalk.popQuiz ? t('chalk.popQuiz') : chalk.main;
  if (chalk.quiet) return { chalk: [main], more: t('chalk.canWait') };
  return {
    chalk: [main, ...chalk.next],
    more: chalk.more > 0 ? t('chalk.more', { count: chalk.more }) : '',
  };
}
