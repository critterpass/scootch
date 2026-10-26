import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { readSetting } from '../../data/settings-repository';

/** Where roll call keeps the full name the user gave, as a JSON string. */
export const STUDENT_NAME_KEY = 'student.fullName';

/** The full name given at roll call, or `null` before roll call. */
export function useStudentName(): string | null {
  const db = useSQLiteContext();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void readSetting<string>(db, STUDENT_NAME_KEY)
      .then((stored) => {
        if (current) setName(typeof stored === 'string' && stored.trim() !== '' ? stored : null);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db]);
  return name;
}
