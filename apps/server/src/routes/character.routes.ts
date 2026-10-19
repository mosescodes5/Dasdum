import type { FastifyPluginAsync } from 'fastify';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { CLASSES, CLASS_CASH_MULT, HOME_NAMES, SLOTS, baseClassIndex, rollClass, rollHome, rollInventory, zeroHome, type SlotKey } from '../../../../packages/game-core/src/home';
import { GAME_MINUTES_PER_REAL_SECOND, gameDay, gameMinutes } from '../../../../packages/game-core/src/clock';
import { ageOn } from '../../../../packages/game-core/src/identity';
import { xpForLevel } from '../../../../packages/game-core/src/level';
import { decay } from '../../../../packages/game-core/src/needs';
import { generateCharacter } from '../../../../packages/game-core/src/roles';
import { postEntry, withRetry } from '../modules/bank/bank.service';
import { getEconomy } from '../modules/economy/economy';
import { ensureHome } from '../modules/home/home.service';
import { QUIT_AFTER_MS } from '../modules/jobs/jobs.service';

const Body = z.object({ answers: z.tuple([z.number().int().min(0).max(4), z.number().int().min(0).max(4), z.number().int().min(0).max(4), z.number().int().min(0).max(4)]) });
const acctNo = () => String(randomInt(1_000_000_000, 9_999_999_999));
const json = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

export const characterRoutes: FastifyPluginAsync = async (app) => {
  // Client sends ONLY the 4 survey answers. Everything else is rolled and stored by the server.
  app.post('/character', { preHandler: app.authenticateUser, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_INPUT' });
    if (await app.prisma.character.findFirst({ where: { player: { userId: req.userId } }, select: { id: true } }))
      return reply.status(409).send({ error: 'CHARACTER_EXISTS' });

    const g = generateCharacter(parsed.data.answers);
    // The player's own identity is never random: name and age come from their registration.
    const u = await app.prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { firstName: true, lastName: true, dateOfBirth: true } });
    const name = `${u.firstName} ${u.lastName}`, d = u.dateOfBirth, age = ageOn({ day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() });
    // Starting class: the role sets a base, then a dice roll can lift or lower it. Money, home and belongings follow the class.
    const baseIdx = baseClassIndex(g.role.socialClass), ci = rollClass(baseIdx), factor = CLASS_CASH_MULT[ci] / CLASS_CASH_MULT[baseIdx];
    const scale = (kobo: bigint) => BigInt(Math.max(1, Math.round((Number(kobo) / 100) * factor / 500)) * 500) * 100n;
    const cashKobo = scale(g.cashKobo), bankKobo = scale(g.bankKobo), home = rollHome(ci), items = rollInventory(ci);
    // Read-only lookups stay OUTSIDE the transaction (fewer round-trips while it holds locks).
    const occ = await app.prisma.occupation.findUnique({ where: { key: g.role.key } });
    const job = occ && await app.prisma.job.findUnique({ where: { occupationId_rank: { occupationId: occ.id, rank: 0 } } });
    if (!occ || !job) {
      req.log.error({ role: g.role.key }, 'Seed data missing. Run: pnpm db:seed');
      return reply.status(500).send({ error: 'NOT_SEEDED' });
    }

    try {
      const out = await withRetry(() => app.prisma.$transaction(async (tx) => {
        const player = await tx.player.create({ data: { userId: req.userId } });
        const ch = await tx.character.create({ data: {
          playerId: player.id, name, age, socialClass: CLASSES[ci], homeName: HOME_NAMES[ci], cashKobo,
          reputation: g.reputation, occupationId: occ.id,
          skills: { create: Object.entries(g.skills).map(([key, level]) => ({ key, level })) },
          employment: { create: { jobId: job.id } },
          homeSlots: { create: SLOTS.map((slot) => ({ slot, tier: home[slot] })) },
          inventory: { create: items },
        } });
        const acct = await tx.bankAccount.create({ data: { characterId: ch.id, accountNumber: acctNo() } });
        await postEntry(tx, { accountId: acct.id, amountKobo: bankKobo, type: 'OPENING', description: 'Opening balance', idempotencyKey: `open:${ch.id}` });
        return { name, age, occupation: g.role.name, level: 1, socialClass: CLASSES[ci], homeName: HOME_NAMES[ci], home, inventory: items, goal: g.role.goal,
          cashKobo, bankKobo, skills: g.skills, reputation: g.reputation, accountNumber: acct.accountNumber, jobTitle: job.title };
      }, { maxWait: 10_000, timeout: 30_000 })); // generous: the database may be far away (Lagos -> cloud region)
      return reply.type('application/json').send(JSON.stringify(out, json));
    } catch (e) {
      req.log.error(e, 'Character creation failed'); // the REAL reason shows in the server terminal
      return reply.status(500).send({ error: 'CREATE_FAILED' });
    }
  });

  // Everything the HUD/phone needs. READ-ONLY (no row lock, no transaction) and the queries run in parallel, so polling it never
  // blocks an action. Needs are shown with the elapsed decay applied; the database copy is updated whenever you act.
  app.get('/me', { preHandler: app.authenticate, config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (req, reply) => {
    const id = req.auth.characterId;
    const load = () => Promise.all([
      app.prisma.homeSlot.findMany({ where: { characterId: id } }),
      app.prisma.inventoryItem.findMany({ where: { characterId: id }, select: { key: true, name: true, qty: true } }),
      app.prisma.character.findUniqueOrThrow({ where: { id }, include: { account: true, occupation: true, skills: true, employment: { include: { job: true } } } }),
      app.prisma.transaction.findMany({ where: { accountId: req.auth.accountId }, orderBy: { createdAt: 'desc' }, take: 15 }),
    ]);
    const eco = await getEconomy(app.prisma);
    let [slots, inventory, c, tx] = await load();
    if (!slots.length) { await app.prisma.$transaction((t) => ensureHome(t, id), { maxWait: 10_000, timeout: 30_000 }); [slots, inventory, c, tx] = await load(); } // older characters: first load only
    const home = zeroHome(); for (const r of slots) if ((SLOTS as readonly string[]).includes(r.slot)) home[r.slot as SlotKey] = r.tier;
    const needs = decay({ energy: c.energy, hunger: c.hunger, health: c.health, happiness: c.happiness, stress: c.stress }, ((Date.now() - new Date(c.needsUpdatedAt).getTime()) / 1000) * GAME_MINUTES_PER_REAL_SECOND);
    const e = c.employment, now = Date.now(), today = gameDay(gameMinutes(now));
    const job = e && { // everything the Jobs app and the shift timer need
      title: e.job.title, startHour: e.job.shiftStartHour, endHour: e.job.shiftEndHour, shiftMinutes: eco.shiftMinutes, shiftsPerDay: eco.shiftsPerDay,
      shiftsToday: e.lastShiftDay === today ? e.shiftsToday : 0, canQuitAt: e.startedAt.getTime() + QUIT_AFTER_MS,
      shift: e.shiftStartedAt && now - e.shiftStartedAt.getTime() < (eco.shiftMinutes + 5) * 60_000 ? { startedAt: e.shiftStartedAt.getTime(), endsAt: e.shiftStartedAt.getTime() + eco.shiftMinutes * 60_000 } : null,
    };
    return reply.type('application/json').send(JSON.stringify({
      now, job: job ?? null, xp: c.xp, xpFrom: xpForLevel(c.level), xpTo: xpForLevel(c.level + 1), name: c.name, age: c.age, level: c.level, socialClass: c.socialClass, homeName: c.homeName, home, inventory, occupation: c.occupation.name,
      jobTitle: c.employment?.job.title, monthlySalaryKobo: c.employment?.job.monthlySalaryKobo, shiftsWorked: c.employment?.shiftsWorked,
      cashKobo: c.cashKobo, bankKobo: c.account?.balanceKobo, accountNumber: c.account?.accountNumber,
      needs,
      reputation: c.reputation, skills: Object.fromEntries(c.skills.map((s) => [s.key, s.level])),
      transactions: tx.map((t) => ({ id: t.id, type: t.type, amountKobo: t.amountKobo, balanceAfterKobo: t.balanceAfterKobo, description: t.description, createdAt: t.createdAt })),
    }, json));
  });
};
