import { Room, ServerError, type Client } from '@colyseus/core';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateMove } from '../../../../packages/game-core/src/netrules';
import { POSTURES } from '../../../../packages/game-core/src/postures';
import { LOCS, type Loc } from '../../../../packages/game-core/src/world';
import { endShiftNow } from '../modules/jobs/jobs.service';
import { presence } from './presence';
import { verifyTicket, type Ticket } from './ticket';

let prisma: PrismaClient | null = null;
const leaveTimers = new Map<string, ReturnType<typeof setTimeout>>(); // a dropped connection forfeits a running shift after 60s
const forfeit = (cid: string) => { if (prisma) void endShiftNow(prisma, cid).catch(() => undefined); };
export const setRealtimePrisma = (p: PrismaClient) => { prisma = p; };

const Move = z.object({ x: z.number().finite(), z: z.number().finite(), yaw: z.number().finite(), posture: z.enum(POSTURES), speed: z.number().min(0).max(12), loc: z.enum(LOCS) });
const Chat = z.object({ text: z.string().min(1).max(200) });
const VIEW_RADIUS = 90, CHAT_RADIUS = 40, SNAP_MS = 100;
const r2 = (n: number) => Math.round(n * 100) / 100;

interface Peer {
  cid: string; pid: string; name: string; x: number; z: number; yaw: number; posture: string; speed: number; loc: Loc;
  last: number; strikes: number; strikeAt: number; winAt: number; winN: number; lastChat: number; hadPeers: boolean;
}

/** One shared city. Server owns positions; clients only SUGGEST moves, which are validated. Messages (not full state) keep traffic tiny. */
export class CityRoom extends Room {
  maxClients = 100;
  private peers = new Map<string, Peer>(); // sessionId -> peer

  onCreate() {
    this.onMessage('move', (c, raw) => this.onMove(c, raw));
    this.onMessage('chat', (c, raw) => this.onChat(c, raw));
    this.clock.setInterval(() => this.snapshots(), SNAP_MS);
  }
  onAuth(_c: Client, options: { ticket?: string }) {
    const t = verifyTicket(options?.ticket);
    if (!t) throw new ServerError(401, 'Invalid or expired ticket');
    return t;
  }
  onJoin(client: Client, _o: unknown, t: Ticket) {
    for (const [sid, p] of this.peers) if (p.cid === t.cid) { // same character in a second tab: keep the newest
      this.clients.find((c) => c.sessionId === sid)?.leave(4000); this.peers.delete(sid);
    }
    this.peers.set(client.sessionId, { cid: t.cid, pid: t.pid, name: t.name, x: -40, z: 53, yaw: 0, posture: 'stand', speed: 0, loc: 'outside',
      last: Date.now(), strikes: 0, strikeAt: 0, winAt: 0, winN: 0, lastChat: 0, hadPeers: false });
    clearTimeout(leaveTimers.get(t.cid)); leaveTimers.delete(t.cid);
    presence.set(t.cid, { loc: 'outside', online: true });
    forfeit(t.cid); // you come back outside, so any shift that was running is over
  }
  onLeave(client: Client) {
    const p = this.peers.get(client.sessionId); this.peers.delete(client.sessionId);
    if (!p) return; // replaced by a newer tab of the same character
    presence.set(p.cid, { loc: p.loc, online: false });
    leaveTimers.set(p.cid, setTimeout(() => { leaveTimers.delete(p.cid); if (presence.get(p.cid)?.online === false) { presence.delete(p.cid); forfeit(p.cid); } }, 60_000));
  }

  private strike(client: Client, p: Peer, reason: string) {
    const now = Date.now();
    if (now - p.strikeAt > 30_000) { p.strikes = 0; p.strikeAt = now; }
    if (++p.strikes >= 8) {
      void prisma?.auditLog.create({ data: { playerId: p.pid, action: `rt.${reason}`, severity: 'suspicious', detail: { strikes: p.strikes } } }).catch(() => undefined);
      client.leave(4001);
    }
  }
  private onMove(client: Client, raw: unknown) {
    const p = this.peers.get(client.sessionId); if (!p) return;
    const now = Date.now();
    if (now - p.winAt > 1000) { p.winAt = now; p.winN = 0; }
    if (++p.winN > 40) return; // message rate limit
    const m = Move.safeParse(raw); if (!m.success) return;
    const v = validateMove(p, m.data, now);
    if (!v.ok) { this.strike(client, p, v.reason); client.send('correct', { x: p.x, z: p.z, yaw: p.yaw, loc: p.loc }); return; }
    const was = p.loc; Object.assign(p, { ...m.data, last: now });
    if (was !== p.loc) { const pr = presence.get(p.cid); if (pr) pr.loc = p.loc; if (was === 'office') forfeit(p.cid); } // walking out of work ends the shift, unpaid
  }
  private onChat(client: Client, raw: unknown) {
    const p = this.peers.get(client.sessionId); if (!p) return;
    const c = Chat.safeParse(raw), now = Date.now();
    if (!c.success || now - p.lastChat < 700) return;
    const text = c.data.text.replace(/[\u0000-\u001f\u007f]/g, '').trim(); if (!text) return;
    p.lastChat = now;
    for (const [sid, q] of this.peers) {
      if (q.loc !== p.loc || (p.loc === 'outside' && Math.hypot(q.x - p.x, q.z - p.z) > CHAT_RADIUS)) continue;
      this.clients.find((cl) => cl.sessionId === sid)?.send('chat', { id: p.cid, name: p.name, text, t: now });
    }
  }
  /** Interest management: each client only receives players in the same place (and within view range outdoors). */
  private snapshots() {
    if (this.peers.size < 2) return;
    const byId = new Map(this.clients.map((c) => [c.sessionId, c]));
    for (const [sid, me] of this.peers) {
      const list: (string | number)[][] = [];
      for (const [oid, o] of this.peers) {
        if (oid === sid || o.loc !== me.loc) continue;
        if (me.loc === 'outside' && Math.hypot(o.x - me.x, o.z - me.z) > VIEW_RADIUS) continue;
        list.push([o.cid, o.name, r2(o.x), r2(o.z), r2(o.yaw), o.posture, r2(o.speed)]);
      }
      if (list.length || me.hadPeers) byId.get(sid)?.send('snap', list);
      me.hadPeers = list.length > 0;
    }
  }
}
