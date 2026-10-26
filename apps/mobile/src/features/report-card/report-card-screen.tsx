import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Share } from 'react-native';

import type { Task } from '@phusclass/domain/board';

import { readTasks } from '../../data/tasks-repository';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useBoard } from '../../state/board-provider';
import { goBack } from '../../ui/motion/go-back';
import { useCareGuard } from '../care/use-care-guard';
import { fixedLine, lineFor } from '../desk/his-line';
import { useStudentName } from '../desk/use-student-name';
import { useTuition } from '../tuition/tuition-provider';

import { ReportCardView } from './report-card-view';
import { reportCard, termOf, termsOfYear, type Term } from './report-model';
import { subjectName } from './report-words';

/**
 * The report card on the phone's own logbook: finished tasks read from the database, printed one
 * term at a time. It is part of tuition; without it the page is the quiet lock.
 */
export function ReportCardScreen() {
  const crisis = useCareGuard();
  const t = useT();
  const db = useSQLiteContext();
  const router = useRouter();
  const { language } = useLanguage();
  const name = useStudentName();
  const tuition = useTuition();
  const board = useBoard();
  const today = board.now.day;
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [term, setTerm] = useState<Term>(() => termOf(today));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let current = true;
    void readTasks(db, Date.now())
      .then((found) => {
        if (current) setTasks(found);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db]);

  const card = useMemo(() => reportCard(tasks, term), [tasks, term]);
  const comment = card.empty
    ? null
    : (lineFor(language, 'reportCardComment', `${term.years}:${term.number}`)?.text ?? null);
  const conduct = fixedLine(language, 'commentGood');

  if (crisis) return null;

  return (
    <ReportCardView
      terms={termsOfYear(today)}
      card={card}
      later={term.from > today}
      name={name}
      comment={comment}
      conduct={conduct}
      locked={!tuition.enrolled}
      hidden={hidden}
      onTerm={setTerm}
      onHide={setHidden}
      onBack={() => goBack(router, '/')}
      onShare={
        board.heavyToday
          ? null
          : () => {
              const lines = [
                `${t('reportCard.title')} · ${t('reportCard.term', { number: term.number })} · ${term.years}`,
                ...(name !== null ? [name] : []),
                '',
                ...card.lines.map((line) =>
                  hidden
                    ? subjectName(line.subject, t)
                    : `${subjectName(line.subject, t)}: ${line.examples.join(', ')}`,
                ),
                ...(comment !== null ? ['', comment] : []),
                `${t('reportCard.conduct')}: ${conduct}`,
              ];
              void Share.share({ message: lines.join('\n') }).catch(() => undefined);
            }
      }
    />
  );
}
