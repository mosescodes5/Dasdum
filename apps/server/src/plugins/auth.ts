import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance { authenticateUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void> }
  interface FastifyRequest { userId: string }
}
declare module '@fastify/jwt' { interface FastifyJWT { payload: { sub: string }; user: { sub: string } } }

export const COOKIE = 'nl_token';
export const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: 7 * 86400 };

// JWT lives in an httpOnly SameSite=Strict cookie: JS (XSS) can't read it and cross-site requests don't carry it.
export default fp(async (app: FastifyInstance) => {
  app.decorate('authenticateUser', async (req: FastifyRequest, reply: FastifyReply) => {
    try { await req.jwtVerify(); req.userId = req.user.sub; }
    catch { return reply.status(401).send({ error: 'UNAUTHENTICATED' }); }
  });
  // Full game auth: also resolves the player's character + account from the DB (never from the client).
  // The ids never change once a character exists, so they are remembered for 10 minutes: one fewer database round trip on EVERY request.
  const known = new Map<string, { auth: FastifyRequest['auth']; until: number }>();
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    await app.authenticateUser(req, reply);
    if (reply.sent) return;
    const hit = known.get(req.userId);
    if (hit && hit.until > Date.now()) { req.auth = hit.auth; return; }
    const ch = await app.prisma.character.findFirst({ where: { player: { userId: req.userId } }, select: { id: true, playerId: true, account: { select: { id: true } } } });
    if (!ch?.account) return reply.status(409).send({ error: 'NO_CHARACTER' });
    req.auth = { playerId: ch.playerId, characterId: ch.id, accountId: ch.account.id };
    if (known.size > 5000) known.clear();
    known.set(req.userId, { auth: req.auth, until: Date.now() + 10 * 60_000 });
  });
});
