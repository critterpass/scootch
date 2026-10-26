import { useLanguage, useT } from '../../i18n/i18n-provider';
import type { BoardSnapshot } from '../../state/board-view';
import { deskModel } from '../desk/desk-model';
import { chalkDate, chalkWords } from '../desk/room-scene';

/** What the chalkboard says behind him during a period: the same as at the desk. */
export interface SessionChalk {
  readonly chalk: string[];
  readonly date: string;
  readonly more: string;
}

export function useSessionChalk(snapshot: BoardSnapshot): SessionChalk {
  const t = useT();
  const { language } = useLanguage();
  const { chalk } = deskModel({ snapshot, language, name: null });
  return { ...chalkWords(chalk, t), date: chalkDate(snapshot.now.at, language) };
}
