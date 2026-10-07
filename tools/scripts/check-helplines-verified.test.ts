import { describe, expect, it } from 'vitest';

import { HELPLINES, type Helpline } from '../../packages/i18n/src/helplines/helpline-table';

import { helplineReleaseCheck } from './check-helplines-verified';

const verified: readonly Helpline[] = HELPLINES.map((line) => ({
  ...line,
  checkedOn: '2026-10-07',
  hours: line.hours.kind === 'weekly' ? { ...line.hours, checkedOn: '2026-10-07' } : line.hours,
}));

describe('the helpline release check', () => {
  it('passes when every number and every opening hour has a checked date', () => {
    expect(helplineReleaseCheck(verified)).toEqual({ exitCode: 0, report: [] });
  });

  it('fails while one number has no checked date, and names it', () => {
    const [first, ...rest] = verified;
    if (!first) throw new Error('the table is empty');
    const result = helplineReleaseCheck([{ ...first, checkedOn: null }, ...rest]);
    expect(result.exitCode).toBe(1);
    expect(result.report.join('\n')).toContain(first.number);
  });

  it('fails while one line’s hours have no checked date', () => {
    const withUncheckedHours = verified.map((line) =>
      line.hours.kind === 'weekly' ? { ...line, hours: { ...line.hours, checkedOn: null } } : line,
    );
    expect(helplineReleaseCheck(withUncheckedHours).exitCode).toBe(1);
  });
});
