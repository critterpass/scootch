import { DurableObject } from 'cloudflare:workers';

import type { Bindings } from '../env';

import {
  readClientMessage,
  readConnection,
  TABLE_CLOSE_CODES,
  TABLE_PING,
  TABLE_PONG,
  type Attachment,
  type TableErrorCode,
  type TableServerMessage,
} from './table-contract';
import { closeTableRows, isMuted, seatRowAdded, seatRowRemoved } from './table-rows';
import { pushNudge, type NudgeReach } from './nudge-push';
import { snapshotFor } from './table-snapshot';
import {
  admit,
  connected,
  countNudge,
  freeSeat,
  newTable,
  nextAlarmAt,
  nudgesLeftFor,
  startSession,
  tick,
  type AdmitResult,
  type Guest,
  type StoredTable,
} from './table-state';

/**
 * One table. Sockets hibernate, so nothing is kept in memory: the table lives under one storage
 * key, each socket carries its account in its attachment, and presence is read from the open
 * sockets. One alarm serves the session's end, freeing offline seats and closing an empty table.
 *
 * The rules decided here: anyone seated may start a session; a person may join mid-session and
 * is shown the running timer; nudges work with or without a session, three to each person,
 * counted afresh each time a session starts, and only when they reach someone; whoever is in a
 * session keeps their seat through it with no connection; the host leaving changes the host and
 * nothing else.
 */
export class TableObject extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    // Answered by the runtime without waking the table.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(TABLE_PING, TABLE_PONG));
  }

  /** Opens the table with its opener seated. Called once, by the route that made the id. */
  async open(
    id: string,
    opener: { accountId: string; name: string },
    capacity: number,
  ): Promise<void> {
    if ((await this.load()) !== null) return;
    const table = newTable(id, opener, capacity, Date.now());
    await this.save(table);
    await seatRowAdded(this.env.DB, id, opener.accountId);
  }

  async admit(guest: Guest): Promise<AdmitResult> {
    const table = await this.load();
    if (table === null) return 'closed';
    const result = admit(table, guest, Date.now());
    if (result !== 'seated') return result;
    await this.save(table);
    await seatRowAdded(this.env.DB, table.id, guest.accountId);
    this.broadcastState(table);
    return result;
  }

  /** Takes a seat away: a ban, a block, an account deleted, or leaving through a route. */
  async remove(accountId: string): Promise<void> {
    const table = await this.load();
    if (table === null) return;
    await this.vacate(table, accountId, 'seat_removed');
  }

  /**
   * The table as it is stored, for the routes that read it: an invite page, a report, a phone
   * asking where it is seated. One storage read; nothing is written, no alarm moves and no
   * socket is touched. Null once the table has closed.
   */
  async stored(): Promise<StoredTable | null> {
    return this.load();
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const asked = readConnection(request);
    if (asked === null) return new Response('bad request', { status: 400 });
    const { accountId, language } = asked;

    const { 0: client, 1: server } = new WebSocketPair();
    const table = await this.load();
    const seat = table?.seats.find((candidate) => candidate.accountId === accountId);
    if (!table || !seat) {
      // Accepted then closed: a phone cannot read the status of a failed upgrade.
      server.accept();
      server.send(
        JSON.stringify({ type: 'error', code: 'not_seated' } satisfies TableServerMessage),
      );
      server.close(TABLE_CLOSE_CODES.notSeated, 'not_seated');
      return new Response(null, { status: 101, webSocket: client });
    }

    // The same person on a new connection. The message goes first: the old client may never
    // see the close complete.
    for (const old of this.ctx.getWebSockets(accountId)) {
      this.send(old, { type: 'replaced' });
      old.close(TABLE_CLOSE_CODES.replaced, 'replaced');
    }
    seat.workMode = asked.workMode;
    seat.hidden = asked.hidden;
    connected(table, seat, Date.now());
    await this.save(table);
    this.ctx.acceptWebSocket(server, [accountId]);
    server.serializeAttachment({ accountId, language } satisfies Attachment);
    this.broadcastState(table);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const { accountId } = ws.deserializeAttachment() as Attachment;
    const message = readClientMessage(raw);
    if (typeof message === 'string') return this.sendError(ws, message);
    // Settled before the table is loaded, so nothing waits between loading and saving it.
    const reach = message.type === 'nudge' ? await this.reach(accountId, message.to) : null;

    const table = await this.load();
    const seat = table?.seats.find((candidate) => candidate.accountId === accountId);
    if (!table || !seat) return this.sendError(ws, 'not_seated');
    const now = Date.now();

    switch (message.type) {
      case 'start': {
        if (table.endsAt !== null && table.endsAt > now)
          return this.sendError(ws, 'session_running');
        startSession(table, message.minutes, now, (id) => this.isOnline(id));
        await this.save(table);
        return this.broadcastState(table);
      }
      case 'nudge': {
        const to = message.to;
        if (to === accountId || !table.seats.some((each) => each.accountId === to)) {
          return this.sendError(ws, 'bad_target');
        }
        if (nudgesLeftFor(seat, to) === 0) return this.sendError(ws, 'nudge_limit');
        const sockets = reach === 'muted' ? [] : this.ctx.getWebSockets(to);
        // A nudge that reaches nobody is not counted. One that was muted is: the sender gets
        // the same answer as anyone else, so they can never learn that they were muted.
        const delivered = reach === 'muted' || reach === 'pushed' || sockets.length > 0;
        if (delivered) {
          countNudge(seat, to);
          await this.save(table);
        }
        for (const target of sockets) this.send(target, { type: 'nudged', from: accountId });
        this.send(ws, { type: 'nudge_sent', to, nudgesLeft: nudgesLeftFor(seat, to), delivered });
        return delivered ? this.broadcastState(table) : undefined;
      }
      case 'done': {
        seat.done = true;
        await this.save(table);
        return this.broadcastState(table);
      }
      case 'mode': {
        seat.workMode = message.workMode;
        seat.hidden = message.hidden;
        await this.save(table);
        return this.broadcastState(table);
      }
      case 'leave':
        return this.vacate(table, accountId, null);
    }
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      // Already closed.
    }
    await this.wentAway(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.wentAway(ws);
  }

  override async alarm(): Promise<void> {
    const table = await this.load();
    if (table === null) return;
    const now = Date.now();
    const { ended, freed, close } = tick(table, now, (accountId) => this.isOnline(accountId));
    if (close) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      await closeTableRows(this.env.DB, table.id, new Date(now));
      return;
    }
    await this.save(table);
    for (const accountId of freed) await seatRowRemoved(this.env.DB, table.id, accountId);
    if (ended) for (const ws of this.ctx.getWebSockets()) this.send(ws, { type: 'session_ended' });
    this.broadcastState(table);
  }

  private async load(): Promise<StoredTable | null> {
    return (await this.ctx.storage.get<StoredTable>('table')) ?? null;
  }

  /** Stores the table and moves its one alarm to whatever is due next. */
  private async save(table: StoredTable): Promise<void> {
    await this.ctx.storage.put('table', table);
    const due = nextAlarmAt(table);
    if (due === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(due);
  }

  /** How a nudge would reach its person, a push included. Settled before the table is loaded. */
  private async reach(from: string, to: string): Promise<NudgeReach> {
    if (await isMuted(this.env.DB, to, from)) return 'muted';
    if (this.isOnline(to)) return 'online';
    return pushNudge(this.env, await this.load(), from, to);
  }

  /** Frees a seat at once and closes that person's sockets. `tell` is null when they left. */
  private async vacate(
    table: StoredTable,
    accountId: string,
    tell: TableErrorCode | null,
  ): Promise<void> {
    if (!freeSeat(table, accountId, Date.now(), tell === null)) return;
    await this.save(table);
    await seatRowRemoved(this.env.DB, table.id, accountId);
    const theirs = this.ctx.getWebSockets(accountId);
    for (const ws of theirs) {
      if (tell === null) ws.close(TABLE_CLOSE_CODES.left, 'left');
      else {
        this.sendError(ws, tell);
        ws.close(TABLE_CLOSE_CODES.notSeated, tell);
      }
    }
    this.broadcastState(table, theirs);
  }

  /** A socket closed or failed. Its person is offline only if they have no other open socket. */
  private async wentAway(gone: WebSocket): Promise<void> {
    const { accountId } = gone.deserializeAttachment() as Attachment;
    const table = await this.load();
    if (table === null) return;
    const seat = table.seats.find((candidate) => candidate.accountId === accountId);
    if (seat && seat.offlineSince === null && !this.isOnline(accountId, [gone])) {
      seat.offlineSince = Date.now();
      await this.save(table);
    }
    this.broadcastState(table, [gone]);
  }

  /** `gone` are sockets that are closing: they still appear in the list but count for nothing. */
  private isOnline(accountId: string, gone: readonly WebSocket[] = []): boolean {
    return this.ctx
      .getWebSockets(accountId)
      .some((ws) => !gone.includes(ws) && ws.readyState === WebSocket.OPEN);
  }

  /** The full snapshot to every open socket, each in its own language. */
  private broadcastState(table: StoredTable, gone: readonly WebSocket[] = []): void {
    const now = Date.now();
    const online = new Map(
      table.seats.map((seat) => [seat.accountId, this.isOnline(seat.accountId, gone)]),
    );
    for (const ws of this.ctx.getWebSockets()) {
      if (gone.includes(ws)) continue;
      const { accountId, language } = ws.deserializeAttachment() as Attachment;
      this.send(
        ws,
        snapshotFor(table, accountId, language, (id) => online.get(id) === true, now),
      );
    }
  }

  private send(ws: WebSocket, payload: TableServerMessage): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // The socket closed between the lookup and the send.
    }
  }

  private sendError(ws: WebSocket, code: TableErrorCode): void {
    this.send(ws, { type: 'error', code });
  }
}
