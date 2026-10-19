import type { PrismaClient } from '@prisma/client';
import { ACTIONS, effectsFor, type ActionKey } from '../../../../../packages/game-core/src/actions';
import { GAME_MINUTES_PER_REAL_SECOND } from '../../../../../packages/game-core/src/clock';
import { applyEffects, decay, type Needs } from '../../../../../packages/game-core/src/needs';
import { postEntry, withRetry, type Db } from '../bank/bank.service';
import { ensureHome, getHome } from '../home/home.service';

export class LifeError extends Error { constructor(public code: 'COOLDOWN' | 'UNKNOWN_ACTION' | 'MISSING_ITEM') { super(code); } }

/** Locks the character row and returns needs with the elapsed decay applied, plus cooldowns. Writes nothing. */
async function readNeeds(tx: Db, characterId: string, nowMs: number) {
  const rows = await tx.$queryRaw<(Needs & { needsUpdatedAt: Date; actionCooldowns: unknown })[]>`
    SELECT energy, hunger, health, happiness, stress, "needsUpdatedAt", "actionCooldowns" FROM "Character" WHERE id = ${characterId} FOR UPDATE`;
  const r = rows[0];
  const gameMin = ((nowMs - new Date(r.needsUpdatedAt).getTime()) / 1000) * GAME_MINUTES_PER_REAL_SECOND;
  const needs = decay({ energy: r.energy, hunger: r.hunger, health: r.health, happiness: r.happiness, stress: r.stress }, gameMin);
  return { needs, cds: (r.actionCooldowns ?? {}) as Record<string, number> };
}

/** Lazy simulation: needs only change when someone looks. No per-player tick loop, so it scales. Locks the character row. */
export async function syncNeeds(tx: Db, characterId: string, nowMs = Date.now()): Promise<Needs> {
  const { needs } = await readNeeds(tx, characterId, nowMs);
  await tx.character.update({ where: { id: characterId }, data: { ...needs, needsUpdatedAt: new Date(nowMs) } });
  return needs;
}

/** Server decides cost, cooldown and effects; the client only animates the result. */
export async function doAction(prisma: PrismaClient, p: { characterId: string; accountId: string; action: ActionKey; idempotencyKey: string }, nowMs = Date.now()) {
  const def = ACTIONS[p.action];
  if (!def) throw new LifeError('UNKNOWN_ACTION');
  return withRetry(() => prisma.$transaction(async (tx) => {
    const { needs: cur, cds } = await readNeeds(tx, p.characterId, nowMs);
    if (nowMs - (cds[p.action] ?? 0) < def.cooldownMs) throw new LifeError('COOLDOWN');
    // Only the actions that depend on what you own need the home lookup; the rest skip two database round trips.
    let home = { bed: 0, tv: 0 };
    if (p.action === 'sleep' || p.action === 'tv') { await ensureHome(tx, p.characterId); home = await getHome(tx, p.characterId); }
    if (p.action === 'tv' && home.tv < 1) throw new LifeError('MISSING_ITEM');
    let costKobo = 0n;
    if (def.costNaira > 0) { // throws INSUFFICIENT_FUNDS before any effect is applied
      costKobo = BigInt(def.costNaira) * 100n;
      await postEntry(tx, { accountId: p.accountId, amountKobo: -costKobo, type: 'PURCHASE', description: def.label, idempotencyKey: `life:${p.idempotencyKey}` });
    }
    const next = applyEffects(cur, effectsFor(p.action, home));
    await tx.character.update({ where: { id: p.characterId }, data: { ...next, needsUpdatedAt: new Date(nowMs), actionCooldowns: { ...cds, [p.action]: nowMs } } });
    return { needs: next, costKobo };
  }, { timeout: 8000 }));
}
