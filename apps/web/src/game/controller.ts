// Player runtime: a plain mutable object read every frame (no React re-renders at 60fps).
// Interaction flow: tap an object → its MENU opens at once (no network) → pick an option → walk there → the animation starts IMMEDIATELY
// while the server is asked in parallel (cost / cooldown / energy). If the server says no, we undo it and say why. Taps are never dropped:
// you can drop any action (or leave your desk) at any moment; a late server reply never touches a different action.
import { ACTIONS } from '../../../../packages/game-core/src/actions';
import { gameHour, gameMinutes, hour12, inWindow } from '../../../../packages/game-core/src/clock';
import { api, friendly, naira, newKey } from '@/lib/api';
import { cam } from './camera';
import { findPath, isBlocked } from './nav';
import type { PostureName } from './postures';
import { useGame } from './store';
import { BOUNDS, INTERACTABLES, type Interactable, type Loc, type Opt } from './world';

type Mode = 'free' | 'snapping' | 'acting' | 'staying';
type Seat = { x: number; z: number; yaw: number };
export const keys: Record<string, boolean> = {};
export const rt = {
  x: -40, z: 53, yaw: 0, speed: 0, posture: 'stand' as PostureName, mode: 'free' as Mode, loc: 'outside' as Loc,
  active: null as Interactable | null, opt: null as Opt | null, seat: null as Seat | null, step: 0, stepT: 0,
  req: 'ok' as 'pending' | 'ok' | 'err', msg: '', err: '', hinted: false, seq: 0, // seq changes whenever an action starts or is cancelled, so a late server reply can't touch the wrong action
  path: [] as [number, number][], dest: null as [number, number] | null, goal: null as { it: Interactable; opt?: Opt } | null,
};
const K = (...n: string[]) => n.some((k) => keys[k]);
export const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * t;
const homeOf = () => useGame.getState().me?.home ?? {};

export const available = (it: Interactable) => !it.req || (homeOf()[it.req[0]] ?? 0) >= it.req[1];
export const optionsOf = (it: Interactable) => {
  const onShift = !!useGame.getState().me?.job?.shift;
  return (it.options ?? []).filter((o) => (!o.req || (homeOf()[o.req[0]] ?? 0) >= o.req[1]) && (o.when !== 'onShift' || onShift) && (o.when !== 'offShift' || !onShift));
};
export function nearest(): Interactable | null {
  let best: Interactable | null = null, bd = Infinity;
  for (const it of INTERACTABLES) {
    if (it.loc !== rt.loc || !available(it)) continue;
    const d = Math.hypot(it.at[0] - rt.x, it.at[1] - rt.z);
    if (d < (it.radius ?? 1.9) && d < bd) { bd = d; best = it; }
  }
  return best;
}
const near = (it: Interactable, slack = 0) => Math.hypot(it.at[0] - rt.x, it.at[1] - rt.z) < (it.radius ?? 1.9) + slack;
const cancelPath = () => { rt.path = []; rt.dest = null; rt.goal = null; };

/** Why an option can't be used right now (checked on the phone, so there's no wait). Empty string = fine. */
export function blockedReason(opt: Opt): string {
  const st = useGame.getState();
  if (opt.special) return '';
  if (opt.action === 'work') { // your job decides when shifts can start; the server double-checks
    const j = st.me?.job; if (!j) return 'You have no job';
    if (j.shift) return 'Shift running';
    if (j.shiftsToday >= j.shiftsPerDay) return 'Done for today';
    return inWindow(gameHour(gameMinutes(Date.now() + st.skew)), j.startHour, j.endHour) ? '' : `Opens ${hour12(j.startHour)}`;
  }
  if (!opt.action) return '';
  const def = ACTIONS[opt.action];
  const wait = (st.cool[opt.action] ?? 0) - Date.now();
  if (wait > 0) return `Wait ${Math.ceil(wait / 1000)}s`;
  if (def.costNaira > 0 && st.me && BigInt(st.me.bankKobo) < BigInt(def.costNaira) * 100n) return 'Not enough money';
  return '';
}

function guestLayout(seatTier: number, s: Seat) {
  if (seatTier >= 1) { const off = seatTier >= 2 ? 0.6 : 0.42; return { me: { ...s, z: s.z - off }, guest: { x: s.x, z: s.z + off, yaw: s.yaw, chair: false } }; } // sofa: sit side by side
  return { me: s, guest: { x: s.x, z: s.z + 1.25, yaw: s.yaw, chair: true } };                                                                            // plastic chair: a second chair appears
}
const dismissGuest = (instant = false) => {
  const st = useGame.getState(), g = st.guest; if (!g) return;
  st.setGuest(instant ? null : { ...g, leaving: true });
};

function standUp() {
  const s = rt.active?.stand;
  if (s) { rt.x = s[0]; rt.z = s[1]; }
  rt.posture = 'stand'; rt.mode = 'free'; rt.active = null; rt.opt = null; rt.seat = null;
  dismissGuest();
}
/** You can drop whatever you are doing at any moment: sitting, eating, sleeping, even mid-animation. (The server already settled the action.) */
function leaveSpot() { if (rt.mode !== 'free') { rt.seq++; standUp(); } }
function abort() { // the server said no after we'd already started: undo quietly and say why
  useGame.getState().say(rt.err || 'That did not work.');
  dismissGuest(true); standUp();
}

/** Start using an object right now (we're already beside it). */
function begin(it: Interactable, opt?: Opt) {
  const st = useGame.getState();
  cancelPath(); st.openMenu(null);
  if (it.kind === 'enter' && it.to) {
    const leavingWork = rt.loc === 'office' && it.to.loc !== 'office' && !!st.me?.job?.shift;
    st.setGuest(null); rt.loc = it.to.loc; rt.x = it.to.x; rt.z = it.to.z; rt.yaw = it.to.yaw; st.setLoc(it.to.loc);
    if (leavingWork) { st.say('You left work. The shift is cancelled and unpaid.'); setTimeout(() => void useGame.getState().refresh(), 1500); }
    return;
  }
  if (!opt) return;
  const why = blockedReason(opt); if (why) { st.say(why === 'Not enough money' ? 'Not enough money in your bank.' : why + ' before doing that again.'); return; }
  let seat: Seat = opt.seat ?? it.seat ?? { x: rt.x, z: rt.z, yaw: rt.yaw };
  if (opt.guest) {
    const L = guestLayout(homeOf().seat ?? 0, seat); seat = L.me;
    st.setGuest({ key: Date.now(), ...L.guest, leaving: false });
  }
  rt.active = it; rt.opt = opt; rt.seat = seat; rt.mode = 'snapping'; rt.msg = opt.doneMsg ?? 'Done.'; rt.err = ''; rt.req = opt.action ? 'pending' : 'ok';
  if (!opt.action) return;
  // Fire the request now, and let the animation run while it travels.
  const a = opt.action, my = ++rt.seq;
  const call = api<{ startedAt?: number; endsAt?: number; costKobo?: string }>(a === 'work' ? '/jobs/shift/start' : '/life/action', { body: a === 'work' ? {} : { action: a, idempotencyKey: newKey() } });
  call.then((r) => {
    const late = my !== rt.seq; // you walked away before the reply came
    if (a === 'work') rt.msg = `Shift started. Stay at work for ${Math.round(((r.endsAt ?? 0) - (r.startedAt ?? 0)) / 60_000)} minutes to be paid.`;
    else { if (r.costKobo && BigInt(r.costKobo) > 0n) rt.msg += ` (−${naira(r.costKobo)})`; st.markCool(a, ACTIONS[a].cooldownMs); }
    if (late) { st.say(rt.msg); void st.refresh(); return; }
    rt.req = 'ok';
  }).catch((e) => {
    if (a !== 'work' && /Not right now/.test(friendly(e))) st.markCool(a, ACTIONS[a].cooldownMs / 2);
    if (my !== rt.seq) { st.say(friendly(e)); return; }
    rt.err = friendly(e); rt.req = 'err';
  });
}

/** The player chose an option from an object's menu. */
export function choose(it: Interactable, opt: Opt) {
  const st = useGame.getState(); st.openMenu(null);
  if (opt.special === 'end-shift') { void endShift(); return; }
  const why = blockedReason(opt); if (why) { st.say(why === 'Not enough money' ? 'Not enough money in your bank.' : why); return; }
  if (rt.mode === 'staying' && rt.active?.id === it.id) { rt.mode = 'free'; begin(it, opt); return; } // already sitting there: just switch what you're doing
  leaveSpot();
  if (near(it)) { begin(it, opt); return; }
  const p = findPath(rt.loc, [rt.x, rt.z], it.at);
  if (!p?.length) { st.say("Can't get there."); return; }
  rt.path = p; rt.dest = p[p.length - 1]; rt.goal = { it, opt };
}
/** Stop the shift you're on. No pay. */
export async function endShift() {
  const st = useGame.getState();
  try { await api('/jobs/shift/cancel', { body: {} }); st.say('Shift ended. No pay.'); } catch (e) { st.say(friendly(e)); }
  await st.refresh();
}
/** A tap landed ON an object. Doors act at once; everything else opens its menu. */
export function tapObject(it: Interactable) {
  const st = useGame.getState();
  if (it.kind === 'enter') {
    leaveSpot();
    if (near(it, 0.3)) { begin(it); return; }
    const p = findPath(rt.loc, [rt.x, rt.z], it.at); if (!p?.length) { st.say("Can't get there."); return; }
    st.openMenu(null); rt.path = p; rt.dest = p[p.length - 1]; rt.goal = { it }; return;
  }
  st.openMenu(it.id);
}
export function interact() { // keyboard E: stand up, or open the menu of whatever is next to you
  if (rt.mode === 'staying') return standUp();
  const it = nearest(); if (!it) return;
  tapObject(it);
}
/** Walk to a door and go through it (used by the phone's map). */
export function goThrough(id: string) {
  const it = INTERACTABLES.find((i) => i.id === id); if (!it || it.loc !== rt.loc) return false;
  tapObject(it); return true;
}
/** Tap on the open ground: walk there, around obstacles. Works at any moment, even mid-action. */
export function moveTo(wx: number, wz: number) {
  const st = useGame.getState(); if (st.menu) st.openMenu(null); if (st.phone) return;
  leaveSpot();
  const p = findPath(rt.loc, [rt.x, rt.z], [wx, wz]);
  if (!p?.length) { st.say("Can't get there."); return; }
  rt.path = p; rt.dest = p[p.length - 1]; rt.goal = null;
}
function finish() {
  const st = useGame.getState();
  st.say(rt.msg); void st.refresh();
  if (rt.opt?.stay) {
    rt.posture = rt.opt.stay; rt.mode = 'staying';
    if (!rt.hinted) { rt.hinted = true; setTimeout(() => useGame.getState().say('Tap anywhere on the floor to stand up.'), 2200); }
  } else standUp();
}

export function tick(dt: number) {
  const st = useGame.getState();
  switch (rt.mode) {
    case 'free': {
      let ix = (K('d', 'arrowright') ? 1 : 0) - (K('a', 'arrowleft') ? 1 : 0), iz = (K('s', 'arrowdown') ? 1 : 0) - (K('w', 'arrowup') ? 1 : 0);
      if (st.phone) ix = iz = 0;
      const sp = (rt.loc === 'outside' ? 6 : 3.6) * dt;
      let dx = 0, dz = 0;
      if (ix || iz) { // keyboard overrides a tap-walk; directions are relative to where the camera looks
        cancelPath(); const l = Math.hypot(ix, iz); ix /= l; iz /= l;
        dx = ix * Math.cos(cam.yaw) + iz * Math.sin(cam.yaw); dz = -ix * Math.sin(cam.yaw) + iz * Math.cos(cam.yaw);
      } else if (rt.path.length) {
        const [tx, tz] = rt.path[0], ex = tx - rt.x, ez = tz - rt.z, d = Math.hypot(ex, ez);
        if (d <= sp + 0.02) { rt.x = tx; rt.z = tz; rt.path.shift(); }
        else { dx = ex / d; dz = ez / d; }
        if (!rt.path.length) { // arrived
          rt.dest = null; rt.speed = 0; const g = rt.goal; rt.goal = null;
          if (g && near(g.it, 0.3)) begin(g.it, g.opt);
        }
      }
      if (dx || dz) {
        let nx = rt.x + dx * sp, nz = rt.z + dz * sp; const b = BOUNDS[rt.loc];
        nx = Math.max(b.x0, Math.min(b.x1, nx)); nz = Math.max(b.z0, Math.min(b.z1, nz));
        if (isBlocked(rt.loc, nx, nz)) { if (!isBlocked(rt.loc, nx, rt.z)) nz = rt.z; else if (!isBlocked(rt.loc, rt.x, nz)) nx = rt.x; else { nx = rt.x; nz = rt.z; } }
        rt.x = nx; rt.z = nz; rt.yaw = lerpAngle(rt.yaw, Math.atan2(dx, dz), 1 - Math.exp(-14 * dt)); rt.speed = sp / dt;
      } else rt.speed = 0;
      break;
    }
    case 'snapping': {
      if (rt.req === 'err') { abort(); break; }
      const s = rt.seat!, k = 1 - Math.exp(-9 * dt);
      const d = Math.hypot(s.x - rt.x, s.z - rt.z);
      rt.x += (s.x - rt.x) * k; rt.z += (s.z - rt.z) * k; rt.yaw = lerpAngle(rt.yaw, d > 0.15 ? Math.atan2(s.x - rt.x, s.z - rt.z) : s.yaw, 1 - Math.exp(-12 * dt));
      rt.speed = d > 0.1 ? 2.5 : 0;
      if (d < 0.05) { rt.x = s.x; rt.z = s.z; rt.yaw = s.yaw; rt.mode = 'acting'; rt.step = 0; rt.stepT = 0; rt.posture = rt.opt?.steps?.[0]?.posture ?? 'stand'; rt.speed = 0; }
      break;
    }
    case 'acting': {
      if (rt.req === 'err') { abort(); break; }
      const steps = rt.opt?.steps ?? []; rt.stepT += dt;
      if (rt.step >= steps.length) { if (rt.req === 'ok') finish(); break; }            // waiting on a slow server: hold the pose
      if (rt.stepT >= steps[rt.step].seconds) {
        if (rt.step === steps.length - 1) { if (rt.req === 'ok') finish(); else rt.stepT = steps[rt.step].seconds; } // last step: don't finish until the server has agreed
        else { rt.step++; rt.stepT = 0; rt.posture = steps[rt.step].posture; }
      }
      break;
    }
    case 'staying':
      if (K('w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright')) standUp();
      break;
  }
}
