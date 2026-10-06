import { DurableObject } from 'cloudflare:workers';

import type { Language } from '../contracts';
import type { Bindings } from '../env';

import { seatShown, seatShownOutside } from './labels';
import {
  accountHeader,
  languageHeader,
  readClientMessage,
  TABLE_CLOSE_CODES,
  TABLE_MAX_NUDGES,
  TABLE_PING,
  TABLE_PONG,
  workModeSchema,
  type Attachment,
  type TableErrorCode,
  type TableServerMessage,
  type WorkMode,
} from './table-contract';
import { closeTableRows, isMuted, seatRowAdded, seatRowRemoved } from './table-rows';
import {
  admit,
  freeSeat,
  newTable,
  nextAlarmAt,
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
 * is shown the running timer; nudges work with or without a session, three per person, counted
 * afresh each time a session starts; the host leaving changes the host and nothing else.
 */
export class TableObject extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    // Answered by the runtime without waking the table.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(TABLE_PING, TABLE_PONG));
  }

  /** Opens the table with its opener seated. Called once, by the route that made the id. */
  async open(id: string, opener: { accountId: string; name: string }): Promise<void> {
    if ((await this.load()) !== null) return;
    const table = newTable(id, opener, Date.now());
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

  /** Who is seated and how many nudges each has sent. Ids and counts only. */
  async facts(): Promise<{ accountId: string; nudgesSent: number }[] | null> {
    const table = await this.load();
    return table?.seats.map(({ accountId, nudgesSent }) => ({ accountId, nudgesSent })) ?? null;
  }

  /**
   * The seats as an invite link shows them: a name, and a label with its work mode unless hidden.
   * No ids. One storage read; nothing is written, no alarm moves and no socket is touched.
   */
  async seatsOutside(
    language: Language,
  ): Promise<{ name: string; label: string | null; workMode: WorkMode | null }[] | null> {
    const table = await this.load();
    return (
      table?.seats.map((seat) => ({ name: seat.name, ...seatShownOutside(seat, language) })) ?? null
    );
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const url = new URL(request.url);
    const accountId = request.headers.get(accountHeader);
    const language = request.headers.get(languageHeader) === 'vi' ? 'vi' : 'en';
    // Only a work mode id and a switch may arrive with a connection. Anything else, a label
    // most of all, is refused before the socket exists.
    const mode = workModeSchema.nullable().safeParse(url.searchParams.get('mode'));
    const hidden = url.searchParams.get('hidden');
    const known = [...url.searchParams.keys()].every((key) => key === 'mode' || key === 'hidden');
    if (!accountId || !known || !mode.success || !(hidden === null || hidden === '1')) {
      return new Response('bad request', { status: 400 });
    }

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
    seat.workMode = mode.data;
    seat.hidden = hidden === '1';
    seat.offlineSince = null;
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
    // Read before the table is loaded, so nothing waits between loading and saving it.
    const muted = message.type === 'nudge' && (await isMuted(this.env.DB, message.to, accountId));

    const table = await this.load();
    const seat = table?.seats.find((candidate) => candidate.accountId === accountId);
    if (!table || !seat) return this.sendError(ws, 'not_seated');
    const now = Date.now();

    switch (message.type) {
      case 'start': {
        if (table.endsAt !== null && table.endsAt > now)
          return this.sendError(ws, 'session_running');
        table.endsAt = now + message.minutes * 60_000;
        table.minutes = message.minutes;
        for (const each of table.seats) each.nudgesSent = 0;
        await this.save(table);
        return this.broadcastState(table);
      }
      case 'nudge': {
        if (
          message.to === accountId ||
          !table.seats.some((each) => each.accountId === message.to)
        ) {
          return this.sendError(ws, 'bad_target');
        }
        if (seat.nudgesSent >= TABLE_MAX_NUDGES) return this.sendError(ws, 'nudge_limit');
        seat.nudgesSent += 1;
        await this.save(table);
        // A muted sender gets the same answer as anyone else and is never told.
        if (!muted) {
          for (const target of this.ctx.getWebSockets(message.to)) {
            this.send(target, { type: 'nudged', from: accountId });
          }
        }
        this.send(ws, {
          type: 'nudge_sent',
          to: message.to,
          nudgesLeft: TABLE_MAX_NUDGES - seat.nudgesSent,
        });
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

  /** Frees a seat at once and closes that person's sockets. `tell` is null when they left. */
  private async vacate(
    table: StoredTable,
    accountId: string,
    tell: TableErrorCode | null,
  ): Promise<void> {
    if (!freeSeat(table, accountId, Date.now())) return;
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
    const online = new Map(
      table.seats.map((seat) => [seat.accountId, this.isOnline(seat.accountId, gone)]),
    );
    for (const ws of this.ctx.getWebSockets()) {
      if (gone.includes(ws)) continue;
      const { accountId, language } = ws.deserializeAttachment() as Attachment;
      this.send(ws, {
        type: 'state',
        you: accountId,
        hostId: table.hostId,
        seats: table.seats.map((seat) => ({
          userId: seat.accountId,
          ...seatShown(seat, language),
          name: seat.name,
          online: online.get(seat.accountId) === true,
          nudgesLeft: TABLE_MAX_NUDGES - seat.nudgesSent,
        })),
        endsAt: table.endsAt,
        minutes: table.minutes,
        serverNow: Date.now(),
      });
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
