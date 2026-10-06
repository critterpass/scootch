# Spike: one Durable Object per table

7 Oct 2026 · throwaway code · wrangler 4.147.0 local mode (`wrangler dev`, workerd), Node 25, no Cloudflare account.

## Verdict

The shape works. One Durable Object class with the WebSocket Hibernation API covers seats, presence, the shared timer, nudges and reconnection in about 200 lines. All 26 checks pass locally; one behaviour needed a protocol change (see "Surprises", item 1).

| Check | Result |
|---|---|
| Four join; each sees four online seats and labels; first to join is host | pass |
| Fifth is refused (close code 4409 `table_full`); table unchanged | pass |
| Start: all four get the same end timestamp, 25 minutes ahead | pass |
| A length other than 10, 25 or 50 minutes, and a second start mid-session, are refused | pass |
| Nudge reaches its target only | pass |
| Fourth nudge from one person refused; limit is per person | pass |
| Abrupt drop (no close handshake): others see offline, seat kept, a fifth still refused | pass |
| Reconnect after 13 s idle: same end timestamp, seat, label and nudge counts | pass |
| Object was evicted during the idle gap, and sockets that sat through it still get broadcasts | pass (hibernation observed) |
| Second connection for the same person replaces the first without an offline flicker | pass, after adding a `replaced` message |
| Host leaves: clean close, next seat becomes host, same end timestamp | pass |
| Freed seat can be taken; newcomer gets the running timer | pass |
| Alarm ends a 16 s session with the host gone and the object hibernated | pass (fired 5 to 7 ms after the end timestamp) |
| Everyone leaves: table storage wiped | pass |

## Message shapes

Join is the connection itself: `GET /table/:id/ws?user=<id>&label=<word>` with `Upgrade: websocket`. In the spike the user id comes from the URL; the real task must take it from the verified session.

| Direction | Message | Meaning |
|---|---|---|
| client → server | `{type:"start", minutes: 10\|25\|50}` | Start a session. Any seated person may start (see open questions) |
| client → server | `{type:"nudge", to: userId}` | Silent nudge to one seat |
| client → server | `{type:"label", label}` | Change own label |
| client → server | `{type:"leave"}` | Give up the seat; server closes with 1000 |
| client → server | `"ping"` (plain text) | Answered `"pong"` by the runtime without waking the object (registered, not exercised in the spike) |
| server → client | `{type:"state", you, hostId, seats:[{userId,label,online,nudgesLeft}], endsAt, minutes, serverNow}` | Full snapshot, sent on every change and on connect. `endsAt` is epoch ms or `null` |
| server → client | `{type:"nudged", from}` | To the target only |
| server → client | `{type:"nudge_sent", to, nudgesLeft}` | To the sender only |
| server → client | `{type:"session_ended"}` | From the alarm, followed by a `state` with `endsAt: null` |
| server → client | `{type:"replaced"}` | This socket lost to a newer one for the same person; do not reconnect |
| server → client | `{type:"error", code}` | `table_full`, `bad_duration`, `session_running`, `no_session`, `nudge_limit`, `bad_target`, `not_seated`, `bad_message`, `unknown_type` |

Close codes: 1000 left, 4001 replaced, 4409 table full. The spike's `state` also carries a `bootId` (debug only, to observe eviction) and `start` accepts `testSeconds` behind a dev variable; neither belongs in the product.

## Surprises

1. **Closing a hibernatable socket from another request never completes for the client (local mode).** When the same person connects again, `fetch` closes the old socket with 4001. The old client received the close frame and sat in `CLOSING` for at least 6 s with no `close` event, with both the `ws` package and Node's built-in WebSocket. Closing a socket inside its own `webSocketMessage` (leave) completes at once. Fix used: send `{type:"replaced"}` before the close, and have the client treat that message as final. Without it, a client that waits for `close` before deciding whether to reconnect would hang. Not known whether production behaves the same.
2. **Hibernation is real locally and fast.** After about 10 s without events the object was rebuilt (new constructor run) while all sockets stayed open. Everything in memory is gone, so all state lives in storage (one `table` key) and the per-socket attachment (`serializeAttachment({userId})`); presence is derived from `getWebSockets(userId)`, never from a field.
3. **The alarm is the timer.** `setAlarm(endsAt)` woke a hibernated object and broadcast to hibernated sockets 5 to 7 ms late. No ticking loop, and nothing holds the object awake during a 50-minute session. A Durable Object has one alarm; the table needs only one. The alarm handler re-checks `endsAt` because alarms can fire more than once.
4. **Reconnection identity is the user id, not the socket.** A seat belongs to a user id and survives a drop; only `leave` frees it. Consequence: someone who force-quits holds a seat forever. The real task needs a rule (free a seat that has been offline for N minutes, or at session end), which a second use of the same alarm can do by storing the next due time.
5. **Presence in `webSocketClose` must exclude the closing socket.** `getWebSockets()` still returns it inside the handler; without the exclusion a replaced or dropped person shows online.
6. **Refusing the fifth: accept, send, close.** A phone WebSocket cannot read an HTTP status from a failed upgrade, so the refusal is a non-hibernating `accept()` plus error message plus close 4409. It works, but each refusal logs `Uncaught Error: Network connection lost` in wrangler (4 refusals, 4 log lines). Harmless locally; noisy if it reaches production logs.
7. **Abrupt drops were detected at once locally** (`webSocketClose` fired straight after the TCP reset). That is loopback; on a phone network a dead connection can stay "online" until a ping fails.
8. **Clock.** `state.serverNow` lets the client correct its clock before rendering the countdown; measured start error was 1 to 31 ms on loopback.

## Local-mode limits: re-test on real Cloudflare

- Item 1: whether a server-initiated close of a hibernated socket completes, and what React Native's WebSocket reports on iOS and Android.
- How long a half-open phone connection (airplane mode, app suspended) shows as online, and the ping interval that fixes it. The source registers a `ping`/`pong` auto-response, but the spike never sent a ping: per the documentation it is answered without waking the object, so it also tells the object nothing. Untested.
- Alarm lateness and eviction timing in production (local eviction was about 10 s; production timing differs).
- Behaviour across a deploy: sockets are dropped on every code update, so reconnection is the normal path, not the rare one.
- Duration billing with four idle sockets for 50 minutes (hibernation should make it near zero; confirm in the dashboard).
- Location: the object lives near whoever created the table; latency for friends elsewhere.
- Not covered at all: Hono in front of the object, Sign in with Apple, bans, mute and report, invite links, labels written by the AI, two real phones.

## Open questions

- Who may start a session: only the host, or anyone seated? The spike allows anyone.
- When is an offline seat freed (item 4)?
- May a person join a table mid-session? The spike allows it and hands over the running timer.
- Do nudges need a running session? The spike says yes (`no_session` otherwise) and resets counts on each start.

## Appendix: Durable Object source

`wrangler.jsonc` needs a `TABLE` binding to `TableDO` and a migration with `new_sqlite_classes: ["TableDO"]`. Plain JavaScript as run; the real task ports it to TypeScript.

```js
import { DurableObject } from "cloudflare:workers";

const MAX_SEATS = 4;
const MAX_NUDGES = 3;
const SESSION_MINUTES = [10, 25, 50];
const CLOSE_TABLE_FULL = 4409;
const CLOSE_REPLACED = 4001;

const emptyTable = () => ({ seats: [], hostId: null, endsAt: null, minutes: null });

export class TableDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Changes whenever the object is rebuilt, so a client can see that the
    // object was evicted (hibernated) between two messages. Debug only.
    this.bootId = crypto.randomUUID();
    // Answered by the runtime without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async load() {
    return (await this.ctx.storage.get("table")) ?? emptyTable();
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const url = new URL(request.url);
    // The real task takes the user id from the verified session, never the URL.
    const userId = url.searchParams.get("user");
    const label = (url.searchParams.get("label") ?? "").slice(0, 24);
    if (!userId) return new Response("missing user", { status: 400 });

    const { 0: client, 1: server } = new WebSocketPair();
    const table = await this.load();
    let seat = table.seats.find((s) => s.userId === userId);

    if (!seat && table.seats.length >= MAX_SEATS) {
      // Accepted then closed, so a phone client (which cannot read an HTTP
      // status on a failed upgrade) gets a readable reason.
      server.accept();
      server.send(JSON.stringify({ type: "error", code: "table_full" }));
      server.close(CLOSE_TABLE_FULL, "table_full");
      return new Response(null, { status: 101, webSocket: client });
    }

    // Same person on a new connection: the old socket is stale. The message
    // goes first because the client may not see the close complete.
    for (const old of this.ctx.getWebSockets(userId)) {
      this.send(old, { type: "replaced" });
      old.close(CLOSE_REPLACED, "replaced");
    }

    if (!seat) {
      seat = { userId, label, nudgesSent: 0 };
      table.seats.push(seat);
      table.hostId ??= userId;
      await this.ctx.storage.put("table", table);
    }
    this.ctx.acceptWebSocket(server, [userId]);
    server.serializeAttachment({ userId });
    this.broadcastState(table);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    const { userId } = ws.deserializeAttachment();
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.sendError(ws, "bad_message");
    }
    const table = await this.load();
    const seat = table.seats.find((s) => s.userId === userId);
    if (!seat) return this.sendError(ws, "not_seated");
    const now = Date.now();
    const running = table.endsAt !== null && table.endsAt > now;

    if (msg.type === "start") {
      if (running) return this.sendError(ws, "session_running");
      let durationMs = SESSION_MINUTES.includes(msg.minutes) ? msg.minutes * 60_000 : null;
      if (this.env.ALLOW_TEST_DURATIONS === "1" && typeof msg.testSeconds === "number") {
        durationMs = msg.testSeconds * 1000;
      }
      if (durationMs === null) return this.sendError(ws, "bad_duration");
      table.endsAt = now + durationMs;
      table.minutes = msg.minutes ?? null;
      for (const s of table.seats) s.nudgesSent = 0;
      await this.ctx.storage.put("table", table);
      await this.ctx.storage.setAlarm(table.endsAt);
      return this.broadcastState(table);
    }

    if (msg.type === "nudge") {
      if (!running) return this.sendError(ws, "no_session");
      if (msg.to === userId || !table.seats.some((s) => s.userId === msg.to)) {
        return this.sendError(ws, "bad_target");
      }
      if (seat.nudgesSent >= MAX_NUDGES) return this.sendError(ws, "nudge_limit");
      seat.nudgesSent += 1;
      await this.ctx.storage.put("table", table);
      for (const target of this.ctx.getWebSockets(msg.to)) {
        this.send(target, { type: "nudged", from: userId });
      }
      return this.send(ws, { type: "nudge_sent", to: msg.to, nudgesLeft: MAX_NUDGES - seat.nudgesSent });
    }

    if (msg.type === "label") {
      seat.label = String(msg.label ?? "").slice(0, 24);
      await this.ctx.storage.put("table", table);
      return this.broadcastState(table);
    }

    if (msg.type === "leave") {
      table.seats = table.seats.filter((s) => s.userId !== userId);
      if (table.hostId === userId) table.hostId = table.seats[0]?.userId ?? null;
      if (table.seats.length === 0) {
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
      } else {
        await this.ctx.storage.put("table", table);
      }
      ws.close(1000, "left");
      return this.broadcastState(table, ws);
    }

    return this.sendError(ws, "unknown_type");
  }

  async webSocketClose(ws, code, reason) {
    try {
      ws.close(code, reason);
    } catch {
      // Already closed.
    }
    this.broadcastState(await this.load(), ws);
  }

  async webSocketError(ws) {
    this.broadcastState(await this.load(), ws);
  }

  async alarm() {
    const table = await this.load();
    if (table.endsAt === null || table.endsAt > Date.now()) return;
    table.endsAt = null;
    table.minutes = null;
    await this.ctx.storage.put("table", table);
    for (const ws of this.ctx.getWebSockets()) this.send(ws, { type: "session_ended" });
    this.broadcastState(table);
  }

  // `gone` is a socket that is closing: it gets nothing and does not count as online.
  broadcastState(table, gone) {
    const isOnline = (userId) =>
      this.ctx.getWebSockets(userId).some((w) => w !== gone && w.readyState === WebSocket.READY_STATE_OPEN);
    const seats = table.seats.map((s) => ({
      userId: s.userId,
      label: s.label,
      online: isOnline(s.userId),
      nudgesLeft: MAX_NUDGES - s.nudgesSent,
    }));
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === gone) continue;
      this.send(ws, {
        type: "state",
        you: ws.deserializeAttachment().userId,
        hostId: table.hostId,
        seats,
        endsAt: table.endsAt,
        minutes: table.minutes,
        serverNow: Date.now(),
        bootId: this.bootId,
      });
    }
  }

  send(ws, payload) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // The socket closed between the lookup and the send.
    }
  }

  sendError(ws, code) {
    this.send(ws, { type: "error", code });
  }
}

export default {
  async fetch(request, env) {
    const match = new URL(request.url).pathname.match(/^\/table\/([\w-]{1,64})\/ws$/);
    if (!match) return new Response("not found", { status: 404 });
    return env.TABLE.get(env.TABLE.idFromName(match[1])).fetch(request);
  },
};
```
