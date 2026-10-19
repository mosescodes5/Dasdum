import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { BankError, deposit, transfer } from '../modules/bank/bank.service';
import { JobError, applyForJob, endShiftNow, finishShift, listOpenings, quitJob, startShift } from '../modules/jobs/jobs.service';
import { LifeError, doAction } from '../modules/life/life.service';
import { ShopError, buyUpgrade } from '../modules/home/home.service';

// Assumes an auth plugin (JWT) that decorates app.authenticate and sets req.auth.
// IDs NEVER come from the request body, so a player can't act as someone else.
declare module 'fastify' {
  interface FastifyInstance { prisma: PrismaClient; authenticate: any }
  interface FastifyRequest { auth: { playerId: string; characterId: string; accountId: string } }
}
const Money = z.number().int().positive().max(100_000_000);
const Key = z.string().uuid(); // client generates one per user action; retries reuse it
const send = (r: any, d: unknown) =>
  r.type('application/json').send(JSON.stringify(d, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));

export const economyRoutes: FastifyPluginAsync = async (app) => {
  const guard = { preHandler: app.authenticate };
  const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

  app.post('/bank/transfer', { ...guard, config: limit(10) }, async (req, reply) =>
    send(reply, await transfer(app.prisma, {
      ...z.object({ toAccountNumber: z.string().regex(/^\d{10}$/), amountNaira: Money,
        note: z.string().max(80).optional(), idempotencyKey: Key }).parse(req.body),
      fromAccountId: req.auth.accountId })));

  app.post('/bank/deposit', { ...guard, config: limit(20) }, async (req, reply) =>
    send(reply, await deposit(app.prisma, {
      ...z.object({ amountNaira: Money, idempotencyKey: Key }).parse(req.body),
      characterId: req.auth.characterId, accountId: req.auth.accountId })));

  app.get('/bank/transactions', { ...guard, config: limit(60) }, async (req, reply) =>
    send(reply, await app.prisma.transaction.findMany({
      where: { accountId: req.auth.accountId }, orderBy: { createdAt: 'desc' }, take: 30 })));

  app.post('/life/action', { ...guard, config: limit(30) }, async (req, reply) =>
    send(reply, await doAction(app.prisma, {
      ...z.object({ action: z.enum(['sleep', 'cook', 'street_food', 'tv', 'shower', 'rest', 'nap', 'guest', 'drink']), idempotencyKey: Key }).parse(req.body),
      characterId: req.auth.characterId, accountId: req.auth.accountId })));

  app.post('/shop/buy', { ...guard, config: limit(20) }, async (req, reply) =>
    send(reply, await buyUpgrade(app.prisma, {
      ...z.object({ slot: z.string().max(20), idempotencyKey: Key }).parse(req.body),
      characterId: req.auth.characterId, accountId: req.auth.accountId })));

  app.post('/jobs/shift/start', { ...guard, config: limit(12) }, async (req, reply) => send(reply, await startShift(app.prisma, req.auth.characterId)));
  app.post('/jobs/shift/finish', { ...guard, config: limit(30) }, async (req, reply) => send(reply, await finishShift(app.prisma, req.auth.characterId)));
  app.post('/jobs/shift/cancel', { ...guard, config: limit(12) }, async (req, reply) => send(reply, await endShiftNow(app.prisma, req.auth.characterId)));
  app.post('/jobs/quit', { ...guard, config: limit(6) }, async (req, reply) => send(reply, await quitJob(app.prisma, req.auth.characterId)));
  app.get('/jobs/openings', { ...guard, config: limit(30) }, async (req, reply) => send(reply, await listOpenings(app.prisma, req.auth.characterId)));

  app.post('/jobs/apply', { ...guard, config: limit(10) }, async (req, reply) =>
    send(reply, await applyForJob(app.prisma, req.auth.characterId,
      z.object({ jobId: z.string() }).parse(req.body).jobId)));

  app.setErrorHandler(async (err, req, reply) => {
    if (err instanceof BankError || err instanceof JobError || err instanceof LifeError || err instanceof ShopError) {
      if (['IDEMPOTENCY_CONFLICT', 'LIMIT_EXCEEDED'].includes(err.code)) // log probing/replay attempts
        await app.prisma.auditLog.create({ data: { playerId: req.auth?.playerId, action: `bank.${err.code}`,
          severity: 'suspicious', detail: { url: req.url } } });
      return reply.status(err.code === 'ACCOUNT_NOT_FOUND' ? 404 : 409).send({ error: err.code });
    }
    if (err instanceof z.ZodError) return reply.status(400).send({ error: 'INVALID_INPUT', issues: err.issues });
    req.log.error(err);
    return reply.status(500).send({ error: 'INTERNAL' });
  });
};
