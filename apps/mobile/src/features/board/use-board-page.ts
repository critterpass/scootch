import { useEffect, useMemo, useRef, useState } from 'react';

import type { PhuMood } from '@phusclass/art/class';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { useCareGuard, useCareView } from '../care/use-care-guard';
import { logbookRows } from '../logbook/logbook-rows';

import { boardControls } from './board-controls';
import type { RowAction } from './board-row';
import { boardDateLine, boardRows } from './board-rows';
import { useSay } from './use-say';

/**
 * Everything the board shows and does, for the board's own screen and for the page it hangs as
 * beside the desk on iPhone Duo: his order, his remark as it opens, "Still yours?" under old
 * chalk, and the row actions.
 */
export function useBoardPage() {
  const crisis = useCareGuard();
  const care = useCareView();
  const careMode = useRef(care.mode);
  careMode.current = care.mode;
  const plain = care.mode === 'plain';
  const snapshot = useBoard();
  const store = useBoardStore();
  const say = useSay();
  const controls = useMemo(() => boardControls(store, say, () => careMode.current), [store, say]);
  const t = useT();
  const { language } = useLanguage();
  const hand = useHandFont();
  const [remark, setRemark] = useState<string | null>(null);

  // His remark as the board opens, once per opening: the long board (once a day) or the empty one.
  useEffect(() => {
    let current = true;
    void controls.opened().then((line) => {
      if (current && line !== null) setRemark(line);
    });
    return () => {
      current = false;
    };
  }, []);

  // "Still yours?" is put once; the store remembers it was. Not asked in plain company.
  const asking = plain ? null : (snapshot.stillYours?.id ?? null);
  useEffect(() => {
    if (asking !== null) void controls.asked(asking);
  }, [asking, controls]);

  const rows = useMemo(
    () =>
      boardRows(
        snapshot.board,
        // In plain company nothing asks to be kept: old chalk stays as it is.
        plain ? new Set<string>() : snapshot.faded,
        snapshot.now,
        language,
        { today: t('board.today') },
        { pressure: care.pressure },
      ),
    [snapshot.board, snapshot.faded, snapshot.now, language, t, plain, care.pressure],
  );

  // His question under each old row, chosen once per row while the board is open.
  const questions = useRef(new Map<string, string>());
  const stillYours: Record<string, string> = {};
  for (const row of rows) {
    if (!row.faded) continue;
    let line = questions.current.get(row.id);
    if (line === undefined) {
      line = say('boardStillYours', row.id, { task: row.text }) ?? '';
      questions.current.set(row.id, line);
    }
    if (line !== '') stillYours[row.id] = line;
  }

  const onAction = (id: string, action: RowAction) => {
    if (action === 'desk') {
      void controls.swap(id).then((line) => {
        if (line !== null) setRemark(line);
      });
    } else if (action === 'tick') void controls.tick(id);
    else if (action === 'erase') void controls.erase(id);
    else if (action === 'keep') void controls.keep(id);
    else if (action === 'letGo') void controls.letGo(id);
  };

  const today = snapshot.now.day;
  const logRows = useMemo(
    () =>
      logbookRows(snapshot.logbook, today, language, {
        minutes: (minutes) => t('logbook.minutes', { minutes }),
        ticked: t('logbook.ticked'),
        certificate: t('logbook.certificate'),
      }),
    [snapshot.logbook, today, language, t],
  );

  const mood: PhuMood = snapshot.desk?.heavy === true ? 'serious' : plain ? 'calm' : 'over';
  return {
    crisis,
    rows,
    remark,
    stillYours,
    mood,
    hand,
    today,
    dateLine: boardDateLine(today, language),
    logRows,
    onAction,
    onReword: (id: string, text: string) => void controls.reword(id, text),
  };
}
