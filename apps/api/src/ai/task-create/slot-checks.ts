import type { Attitude, Language } from '@scootch/domain';
import { treatPlaceholder } from '@scootch/domain';
import {
  checkCueLine,
  checkLine,
  checkWrittenLine,
  cueSlot,
  type LineCheck,
  type LineKind,
  type TaskLineReason,
} from '@scootch/voice';

/**
 * The voice check on a line as the person will read it: the treat line is checked with the
 * treat's name in place of the placeholder when the treat is known, so its length is the real one.
 * Its sentence case is judged with the placeholder still in: the treat's letters are the person's.
 */
export function checkWritten(
  line: { text: string; kind: LineKind; language: Language; attitude: Attitude },
  treat?: string,
): LineCheck {
  if (line.kind !== 'treatHandOver' || treat === undefined) return checkWrittenLine(line);
  const filled = checkLine({
    ...line,
    text: line.text.replaceAll(treatPlaceholder, treat),
    treat,
  });
  return checkWrittenLine(line).reasons.includes('sentence_case')
    ? { ok: false, reasons: [...filled.reasons, 'sentence_case'] }
    : filled;
}

/**
 * The check for one slot of an answer. The cue's notification has its own, which reads the line
 * with a cue where its placeholder stands; every other slot is checked as its kind.
 */
export function checkSlot(
  slot: string,
  line: { text: string; kind: LineKind; language: Language; attitude: Attitude },
  treat?: string,
): { readonly ok: boolean; readonly reasons: readonly TaskLineReason[] } {
  return slot === cueSlot ? checkCueLine(line) : checkWritten(line, treat);
}
