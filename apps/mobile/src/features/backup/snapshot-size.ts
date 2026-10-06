import type { Snapshot } from './snapshot';

/** The largest snapshot the server keeps, in bytes of its JSON. A larger one is refused there. */
export const BACKUP_MAX_BYTES = 512 * 1024;

/** How many bytes a string is as UTF-8, counted without the encoder some phones lack. */
function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      // A surrogate pair is one character of four bytes.
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** The size the server measures: the snapshot's JSON, in bytes. */
export function snapshotBytes(snapshot: Snapshot): number {
  return utf8Bytes(JSON.stringify(snapshot));
}

/**
 * A snapshot that fits under the server's cap, or `null` when none can be made.
 *
 * One that is too large loses the detail of its oldest finished sessions first, one sitting at a
 * time: the session's row, the thoughts parked in it that were already answered, and the lines
 * written for that sitting on its finished task. Those are only ever read during a session, so a
 * restored world looks the same without them. Monsters and their cards, world pieces, record
 * bars, week records, the drawer and the settings are never touched; if dropping every finished
 * session's detail is still not enough, nothing is uploaded.
 */
export function fitSnapshot(snapshot: Snapshot, maxBytes = BACKUP_MAX_BYTES): Snapshot | null {
  let size = snapshotBytes(snapshot);
  if (size <= maxBytes) return snapshot;

  const finished = snapshot.sessions
    .filter((session) => session.endedAt !== null)
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0));
  const sessions = new Set(snapshot.sessions);
  const thoughts = new Set(snapshot.parkedThoughts);
  const tasks = new Map(snapshot.tasks.map((task) => [task.id, task]));
  const fitted = (): Snapshot => ({
    ...snapshot,
    tasks: snapshot.tasks.map((task) => tasks.get(task.id) ?? task),
    sessions: snapshot.sessions.filter((session) => sessions.has(session)),
    parkedThoughts: snapshot.parkedThoughts.filter((thought) => thoughts.has(thought)),
  });

  for (const session of finished) {
    sessions.delete(session);
    let freed = utf8Bytes(JSON.stringify(session)) + 1;
    for (const thought of snapshot.parkedThoughts) {
      if (thought.sessionId !== session.id || thought.resolution === null) continue;
      thoughts.delete(thought);
      freed += utf8Bytes(JSON.stringify(thought)) + 1;
    }
    const task = tasks.get(session.taskId);
    if (task && task.status === 'finished' && (task.lines !== null || task.notifications.length)) {
      const lighter = { ...task, lines: null, notifications: [] };
      freed += utf8Bytes(JSON.stringify(task)) - utf8Bytes(JSON.stringify(lighter));
      tasks.set(task.id, lighter);
    }
    size -= freed;
    // The running count is an estimate; the real size is measured before anything is trusted.
    if (size > maxBytes) continue;
    const candidate = fitted();
    size = snapshotBytes(candidate);
    if (size <= maxBytes) return candidate;
  }
  return null;
}
