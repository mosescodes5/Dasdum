// The game clock IS the real clock, in Lagos time (WAT = UTC+1, no daylight saving). The SERVER clock is the only one that counts.
export const LAGOS_OFFSET_MS = 60 * 60_000;
export const GAME_EPOCH_MS = Date.UTC(2026, 0, 1) - LAGOS_OFFSET_MS; // midnight in Lagos on 1 Jan 2026
export const GAME_MINUTES_PER_REAL_SECOND = 1 / 60;                    // one game minute per real minute
export const gameMinutes = (nowMs = Date.now()) => Math.floor((nowMs - GAME_EPOCH_MS) / 60_000);
export const gameDay = (m: number) => Math.floor(m / 1440);
export const gameHour = (m: number) => Math.floor((m % 1440) / 60);
/** A Date whose UTC fields read as Lagos wall-clock time (use getUTCDate / getUTCHours on it). */
export const lagosDate = (nowMs = Date.now()) => new Date(nowMs + LAGOS_OFFSET_MS);
/** Is this hour inside a shift window? A window like 20 → 6 wraps past midnight; 0 → 24 is all day. */
export const inWindow = (hour: number, start: number, end: number) => (start < end ? hour >= start && hour < end : hour >= start || hour < end);
export const hour12 = (h: number) => `${h % 12 || 12}:00 ${h % 24 < 12 ? 'AM' : 'PM'}`;
