import type { Translate } from '../../i18n/i18n-provider';

import type { RowAction } from './board-row';
import type { BoardRow } from './board-rows';

/**
 * What VoiceOver says for a row and the actions it offers by name: everything a swipe, a tap or a
 * long-press can do, and Keep and Let go on old chalk.
 */
export function rowSpeech(row: BoardRow, stillYours: string | null, t: Translate) {
  const details = [
    row.onDesk ? t('board.row.onDesk') : null,
    row.mark.kind === 'tally' ? t('board.row.slips', { count: row.mark.count }) : null,
    row.mark.kind === 'tally' && row.mark.frontRow ? t('board.frontRow') : null,
    row.mark.kind === 'date' ? t('board.row.due', { date: row.mark.label }) : null,
    row.faded ? t('board.row.faded') : null,
    stillYours,
  ].filter((part): part is string => part !== null);
  const label: Record<RowAction, string> = {
    desk: t('board.menu.desk'),
    reword: t('board.menu.reword'),
    tick: t('board.menu.tick'),
    erase: t('board.menu.erase'),
    keep: t('board.stillYours.keep'),
    letGo: t('board.stillYours.letGo'),
  };
  const offered: RowAction[] = [
    ...(row.onDesk ? [] : (['desk'] as const)),
    'reword',
    'tick',
    'erase',
    ...(row.faded ? (['keep', 'letGo'] as const) : []),
  ];
  return {
    label: [row.full, ...details].join('. '),
    actions: [{ name: 'activate' }, ...offered.map((name) => ({ name, label: label[name] }))],
    /** The row action a VoiceOver action names, if it is one this row offers. */
    actionNamed: (name: string): RowAction | null =>
      offered.includes(name as RowAction) ? (name as RowAction) : null,
  };
}
