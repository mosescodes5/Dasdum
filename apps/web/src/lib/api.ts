export class ApiError extends Error { constructor(public status: number, public code: string, public fields?: Record<string, string>) { super(code); } }

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? 'POST' : 'GET');
  const r = await fetch('/api' + path, {
    method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(opts.body ?? {}), // POST always sends a JSON body (Fastify rejects empty)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.error ?? 'ERROR', j.fields);
  return j as T;
}
/** One fresh key per user action. A retry of the SAME action reuses it; a new click gets a new one. */
export const newKey = () => crypto.randomUUID();
export const naira = (kobo: string | number | bigint | undefined | null) =>
  kobo == null ? '—' : '₦' + (BigInt(kobo) / 100n).toLocaleString('en-NG');

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Wrong username/email or password.', USERNAME_TAKEN: 'That username is taken.', PHONE_TAKEN: 'That phone number is already registered.', UNDERAGE: 'Registration unavailable. You must be at least 18 years old to create an account.', EMAIL_TAKEN: 'That email is already registered.', INVALID_INPUT: 'Please check the details you entered (password needs 10+ characters).',
  INSUFFICIENT_FUNDS: 'Not enough money.', OUTSIDE_SHIFT_HOURS: 'This job is not taking shifts right now. Check its hours in the Jobs app.', DAILY_SHIFTS_DONE: 'You have done all your shifts for today. Come back tomorrow.',
  ALREADY_EMPLOYED: 'You already have a job. Quit it first.', TOO_SOON_TO_QUIT: 'You can only quit after your first full day in the job.', NOT_AT_WORK: 'You need to be inside your workplace.', SHIFT_ACTIVE: 'You are already on a shift.', NO_ACTIVE_SHIFT: 'You are not on a shift.', SHIFT_NOT_FINISHED: 'The shift is not over yet.', REQUIREMENTS_NOT_MET: 'You do not meet the requirements for that job yet.', NO_SUCH_JOB: 'That job no longer exists.',
  TOO_TIRED: 'Too tired to work. Rest first.', NOT_EMPLOYED: 'You have no job.', CHARACTER_EXISTS: 'You already have a character.', MISSING_ITEM: "You don't own that yet. Check the Market on your phone.", MAX_TIER: 'That is already the best you can get.', COOLDOWN: 'Not right now — give it a little while.', ERROR: 'Something went wrong. Try again.',
};
export const friendly = (e: unknown) => (e instanceof ApiError ? MESSAGES[e.code] ?? e.code : 'Network error.');
