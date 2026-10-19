'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { gameHour, gameMinutes, hour12, inWindow, lagosDate } from '../../../../packages/game-core/src/clock';
import { CATALOG, SLOTS, SLOT_LABEL } from '../../../../packages/game-core/src/home';
import { BUILDINGS, HOME_B, STREETS, WORK_B, districtAt } from '../../../../packages/game-core/src/world';
import { Money } from '@/components/ui';
import { goThrough, rt } from '@/game/controller';
import { peers, sendChat } from '@/game/net';
import { useGame, type AppKey, type Quality } from '@/game/store';
import { api, friendly, naira, newKey } from '@/lib/api';

/* ---------- the home screen ---------- */
type Tile = { key: AppKey | 'social' | 'transport'; icon: string; name: string; bg: string; soon?: boolean };
const TILES: Tile[] = [
  { key: 'bank', icon: '🏦', name: 'Bank', bg: 'from-emerald-400 to-emerald-700' },
  { key: 'jobs', icon: '💼', name: 'Jobs', bg: 'from-sky-400 to-blue-700' },
  { key: 'chat', icon: '💬', name: 'Chat', bg: 'from-green-400 to-green-700' },
  { key: 'market', icon: '🛒', name: 'Market', bg: 'from-amber-400 to-orange-600' },
  { key: 'bag', icon: '🎒', name: 'Bag', bg: 'from-rose-400 to-rose-700' },
  { key: 'contacts', icon: '👥', name: 'Contacts', bg: 'from-teal-400 to-teal-700' },
  { key: 'map', icon: '🗺️', name: 'Map', bg: 'from-lime-400 to-green-700' },
  { key: 'calendar', icon: '📅', name: 'Calendar', bg: 'from-red-400 to-red-700' },
  { key: 'settings', icon: '⚙️', name: 'Settings', bg: 'from-slate-400 to-slate-700' },
  { key: 'social', icon: '📸', name: 'Social', bg: 'from-fuchsia-400 to-purple-700', soon: true },
  { key: 'transport', icon: '🚌', name: 'Transport', bg: 'from-yellow-400 to-yellow-700', soon: true },
];
const TITLE: Record<AppKey, string> = { bank: 'Bank', jobs: 'Jobs', chat: 'Chat', market: 'Market', bag: 'Bag', contacts: 'Contacts', map: 'Map', calendar: 'Calendar', settings: 'Settings' };

const clock12 = (m: number) => { const h = Math.floor((m / 60) % 24), mi = Math.floor(m % 60); return `${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function useGameMinutes(ms = 1000) { const [m, setM] = useState(0); useEffect(() => { const f = () => setM(gameMinutes()); f(); const a = setInterval(f, ms); return () => clearInterval(a); }, [ms]); return m; }
/** Walk to a door/object from the phone: closes the phone and sets off. */
function walkTo(id: string) {
  const st = useGame.getState();
  if (rt.loc !== 'outside') { st.say('Step outside first.'); return; }
  st.togglePhone(); goThrough(id);
}

function StatusBar() {
  const m = useGameMinutes(), net = useGame((s) => s.net), close = useGame((s) => s.togglePhone);
  return (<div className="flex items-center justify-between px-5 pb-1 pt-2 text-[11px] font-semibold text-cream/90">
    <span>{clock12(m)}</span>
    <span className="flex items-center gap-1.5"><span>{net === 'online' ? '▂▄▆█' : '▂'}</span><span>Airtel</span><span>🔋</span>
      <button aria-label="Close phone" onClick={close} className="tap ml-1 grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[10px]">✕</button></span>
  </div>);
}
function HomeScreen() {
  const m = useGameMinutes(), openApp = useGame((s) => s.openApp), say = useGame((s) => s.say), bank = useGame((s) => s.me?.bankKobo);
  const d = lagosDate();
  return (<div className="h-full overflow-y-auto bg-gradient-to-b from-[#12452c] via-[#0b2a1b] to-[#07110c] p-4">
    <div className="mb-5 rounded-3xl bg-black/25 p-4">
      <div className="text-4xl font-extrabold leading-none">{clock12(m)}</div>
      <div className="mt-1 text-xs text-cream/70">{DAYS[d.getUTCDay()]}, {d.getUTCDate()} {MONTHS[d.getUTCMonth()]}</div>
      <div className="mt-2 text-xs text-cream/60">Bank · <b className="text-gold"><Money kobo={bank} /></b></div>
    </div>
    <div className="grid grid-cols-4 gap-x-2 gap-y-4">
      {TILES.map((t) => (
        <button key={t.key} onClick={() => (t.soon ? say(`${t.name} arrives in a later update.`) : openApp(t.key as AppKey))} className={`tap flex flex-col items-center gap-1 transition-transform active:scale-90 ${t.soon ? 'opacity-55' : ''}`}>
          <span className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${t.bg} text-2xl shadow-lg`}>{t.icon}{t.soon && <span className="absolute -right-1 -top-1 rounded-full bg-black/80 px-1.5 text-[8px] font-bold">SOON</span>}</span>
          <span className="text-[11px] leading-none">{t.name}</span>
        </button>))}
    </div>
  </div>);
}

/* ---------- apps ---------- */
const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`rounded-2xl bg-white/5 p-3 ${className}`}>{children}</div>;
const Pill = ({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) =>
  <button onClick={onClick} disabled={disabled} className={`tap rounded-xl bg-gradient-to-b from-naija-light to-naija px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-40 ${className}`}>{children}</button>;

function BankApp() {
  const me = useGame((s) => s.me)!, say = useGame((s) => s.say), refresh = useGame((s) => s.refresh), [busy, setBusy] = useState(false);
  async function deposit() {
    if (busy) return; setBusy(true);
    try { await api('/bank/deposit', { body: { amountNaira: 5000, idempotencyKey: newKey() } }); say('Deposited ₦5,000'); await refresh(); } catch (e) { say(friendly(e)); } finally { setBusy(false); }
  }
  return (<div className="space-y-3">
    <div className="rounded-2xl bg-gradient-to-br from-naija-light via-naija to-naija-dark p-4 shadow-lg"><div className="text-xs opacity-80">Available balance</div><div className="text-3xl font-extrabold"><Money kobo={me.bankKobo} /></div><div className="mt-2 text-xs opacity-80">Acct {me.accountNumber}</div></div>
    <Pill className="w-full" onClick={deposit} disabled={busy || BigInt(me.cashKobo) < 500_000n}>{busy ? 'Depositing…' : 'Deposit ₦5,000 cash'}</Pill>
    <div>{me.transactions.length === 0 && <p className="text-xs text-cream/60">No transactions yet.</p>}{me.transactions.map((t) => (
      <div key={t.id} className="flex justify-between gap-2 border-b border-white/10 py-1.5 text-xs"><span>{t.description}</span><span className={BigInt(t.amountKobo) < 0n ? 'text-red-300' : 'text-green-300'}>{naira(t.amountKobo)}</span></div>))}</div>
  </div>);
}
type Opening = { id: string; title: string; field: string; monthlySalaryKobo: string; startHour: number; endHour: number; minReputation: number; minLevel: number; eligible: boolean };
function JobsApp() {
  const me = useGame((s) => s.me)!, say = useGame((s) => s.say), refresh = useGame((s) => s.refresh), skew = useGame((s) => s.skew), job = me.job;
  const [busy, setBusy] = useState(false), [sure, setSure] = useState(false), [openings, setOpenings] = useState<Opening[] | null>(null), [now, setNow] = useState(() => Date.now());
  useEffect(() => { const a = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(a); }, []);
  useEffect(() => { if (job) return; api<Opening[]>('/jobs/openings').then(setOpenings).catch((e) => say(friendly(e))); }, [job, say]);
  const run = async (f: () => Promise<string>) => { if (busy) return; setBusy(true); try { say(await f()); await refresh(); } catch (e) { say(friendly(e)); } finally { setBusy(false); setSure(false); } };

  if (!job) return (<div className="space-y-3 text-sm">
    <Card><div className="font-semibold">You have no job</div><p className="mt-1 text-xs text-cream/60">Pick one below. Bills don't wait.</p></Card>
    {!openings && <p className="text-xs text-cream/60">Loading jobs…</p>}
    {openings?.map((o) => (<Card key={o.id}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="font-semibold">{o.title}</div><div className="text-xs text-cream/60">{o.field}</div>
      <div className="mt-1 text-xs">{naira(o.monthlySalaryKobo)} / month</div><div className="text-[11px] text-cream/50">Level {o.minLevel}+ · Shifts start {hour12(o.startHour)}–{o.endHour === 24 ? 'any time' : hour12(o.endHour)}</div>
      {!o.eligible && <div className="mt-0.5 text-[11px] text-amber-300">{me.level < o.minLevel ? `Needs level ${o.minLevel} (you are ${me.level})` : `Needs reputation ${o.minReputation} (you have ${Math.floor(me.reputation)})`}</div>}</div>
      <Pill disabled={!o.eligible || busy} className="!px-3 !py-1.5 text-xs" onClick={() => run(async () => { await api('/jobs/apply', { body: { jobId: o.id } }); return `You are now a ${o.title}.`; })}>Apply</Pill></div></Card>))}
  </div>);

  const leftMs = job.shift ? Math.max(0, job.shift.endsAt - (now + skew)) : 0, sec = Math.ceil(leftMs / 1000), quitIn = job.canQuitAt - (now + skew), canQuit = quitIn <= 0;
  const h = gameHour(gameMinutes(now + skew)), open = inWindow(h, job.startHour, job.endHour), left = job.shiftsPerDay - job.shiftsToday;
  const hrs = Math.floor(Math.max(0, quitIn) / 3_600_000), mins = Math.ceil((Math.max(0, quitIn) % 3_600_000) / 60_000);
  return (<div className="space-y-3 text-sm">
    <Card><div className="text-lg font-bold">{job.title}</div><div className="text-xs text-cream/60">{me.occupation}</div><div className="mt-2">{naira(me.monthlySalaryKobo)} / month · {me.shiftsWorked ?? 0} shifts done</div>
      <div className="mt-2 text-xs text-cream/70">Level {me.level} · {me.xp - me.xpFrom}/{me.xpTo - me.xpFrom} XP</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (100 * (me.xp - me.xpFrom)) / (me.xpTo - me.xpFrom))}%` }} /></div></Card>
    {job.shift ? (<Card><div className="font-semibold text-green-300">● On shift · {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')} left</div><p className="mt-1 text-xs text-cream/60">Stay inside your workplace until the timer ends. Leave early and you are not paid.</p>
        <Pill className="mt-2 w-full !from-slate-500 !to-slate-700" disabled={busy} onClick={() => run(async () => { await api('/jobs/shift/cancel', { body: {} }); return 'Shift cancelled. No pay.'; })}>Cancel shift</Pill></Card>)
      : (<Card><div className={open && left > 0 ? 'font-semibold text-green-300' : 'font-semibold text-amber-300'}>{left <= 0 ? '○ All shifts done today' : open ? '● You can start a shift now' : `○ Shifts start at ${hour12(job.startHour)}`}</div>
        <p className="mt-1 text-xs text-cream/60">{job.shiftMinutes}-minute shifts · {left > 0 ? left : 0} of {job.shiftsPerDay} left today · start between {hour12(job.startHour)} and {job.endHour === 24 ? 'midnight' : hour12(job.endHour)}. Pay comes only when the shift is complete.</p></Card>)}
    <Pill className="w-full" onClick={() => walkTo('door-work')}>Walk to work</Pill>
    <Card className="text-xs">
      {canQuit ? <>You can quit this job.</> : <>You can quit after your first full day. Available in {hrs}h {mins}m.</>}
      <Pill disabled={!canQuit || busy} className="mt-2 w-full !from-red-500 !to-red-700" onClick={() => (sure ? run(async () => { await api('/jobs/quit', { body: {} }); return 'You quit your job.'; }) : setSure(true))}>{sure ? 'Tap again to confirm quitting' : 'Quit job'}</Pill>
    </Card>
  </div>);
}
function ChatApp() {
  const chat = useGame((s) => s.chat), net = useGame((s) => s.net), box = useRef<HTMLDivElement>(null), [text, setText] = useState('');
  useEffect(() => { box.current?.scrollTo({ top: 1e6 }); }, [chat.length]);
  const send = () => { if (!text.trim()) return; sendChat(text); setText(''); };
  return (<div className="flex h-full flex-col gap-2">
    <div className="text-[11px] text-cream/60">{net === 'online' ? '🟢 Talking to people nearby' : net === 'connecting' ? '🟡 Connecting…' : '🔴 Offline — retrying'}</div>
    <div ref={box} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
      {chat.length === 0 && <p className="text-sm text-cream/60">No messages yet. Say hi to people nearby.</p>}
      {chat.map((c) => <div key={c.t + c.id} className="rounded-2xl rounded-bl-md bg-white/10 px-3 py-1.5 text-sm"><b className="text-gold">{c.name.split(' ')[0]}</b> {c.text}</div>)}
    </div>
    <div className="flex gap-2"><input id="chat-input" className="input !py-2 text-sm" maxLength={200} placeholder="Message" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} /><Pill onClick={send} className="!px-3">Send</Pill></div>
  </div>);
}
function MarketApp() {
  const me = useGame((s) => s.me)!, say = useGame((s) => s.say), refresh = useGame((s) => s.refresh), [buying, setBuying] = useState<string | null>(null);
  async function buy(slot: string) {
    if (buying) return; setBuying(slot); // one purchase at a time: a second tap can't charge twice
    try { await api('/shop/buy', { body: { slot, idempotencyKey: newKey() } }); say('Upgraded! Take a look at your home.'); await refresh(); } catch (e) { say(friendly(e)); } finally { setBuying(null); }
  }
  return (<div className="space-y-2"><p className="text-xs text-cream/60">Improve your home one step at a time. You pay from your bank balance.</p>
    {SLOTS.map((sl) => {
      const cur = me.home?.[sl] ?? 0, next = CATALOG[sl][cur + 1], price = next ? BigInt(next.priceNaira) * 100n : 0n, short = next ? price - BigInt(me.bankKobo) : 0n;
      return (<Card key={sl}><div className="flex justify-between text-xs"><span className="text-gold">{SLOT_LABEL[sl]}</span><span className="text-cream/50">{cur + 1}/{CATALOG[sl].length}</span></div>
        <div className="text-sm font-semibold">{CATALOG[sl][cur].name}</div>
        {next ? (<div className="mt-2 flex items-center justify-between gap-2"><div className="min-w-0 text-xs"><div>{next.name}</div><div className="text-cream/60">{next.blurb}</div>{short > 0n && <div className="mt-0.5 text-amber-300">Need {naira(short)} more</div>}</div>
          <Pill disabled={short > 0n || !!buying} onClick={() => buy(sl)} className="whitespace-nowrap !px-3 !py-1.5 text-xs">{buying === sl ? '…' : naira(price)}</Pill></div>) : <div className="mt-1 text-xs text-green-300">✓ Best available</div>}
      </Card>);
    })}</div>);
}
function BagApp() {
  const me = useGame((s) => s.me)!;
  return (<div className="space-y-3 text-sm"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-gold/20 px-3 py-1 text-xs text-gold">{me.socialClass}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">🏠 {me.homeName}</span></div>
    <div className="space-y-1">{me.inventory?.map((i) => <div key={i.key} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5"><span>{i.name}</span>{i.qty > 1 && <span>×{i.qty}</span>}</div>)}</div></div>);
}
function ContactsApp() {
  const me = useGame((s) => s.me)!, say = useGame((s) => s.say), [, tick] = useState(0);
  useEffect(() => { const a = setInterval(() => tick((n) => n + 1), 1500); return () => clearInterval(a); }, []);
  const near = [...peers.values()];
  const copy = async () => { try { await navigator.clipboard.writeText(me.accountNumber); say('Account number copied.'); } catch { say(`Account: ${me.accountNumber}`); } };
  return (<div className="space-y-3 text-sm">
    <Card><div className="text-xs text-cream/60">My details</div><div className="font-semibold">{me.name}</div><div className="mt-1 flex items-center justify-between text-xs"><span>Acct {me.accountNumber}</span><button onClick={copy} className="tap rounded-lg bg-white/10 px-2 py-1">Copy</button></div></Card>
    <div className="text-xs font-semibold uppercase tracking-wide text-cream/60">People nearby ({near.length})</div>
    {near.length === 0 && <p className="text-xs text-cream/60">No one else is around right now.</p>}
    {near.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-teal-600 font-bold">{p.name.slice(0, 1)}</span><span>{p.name}</span></div>)}
  </div>);
}
const SPOTS: { id: string; icon: string; name: string }[] = [{ id: 'door-home', icon: '🏠', name: 'Walk home' }, { id: 'door-work', icon: '💼', name: 'Walk to work' }, { id: 'market', icon: '🍛', name: 'Go to the food stall' }];
function MapApp() {
  const [, tick] = useState(0), loc = rt.loc;
  useEffect(() => { const a = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(a); }, []);
  const at = loc === 'outside' ? [rt.x, rt.z] : loc === 'home' ? [HOME_B.x, HOME_B.z] : [WORK_B.x, WORK_B.z], R = [-100, -60, -20, 20, 60, 100];
  return (<div className="space-y-3">
    <svg viewBox="-115 -115 230 230" className="w-full rounded-2xl bg-[#c9a77a]">
      {R.map((v) => <g key={v}><rect x={v - 3} y={-115} width={6} height={230} fill="#4a4d52" /><rect x={-115} y={v - 3} width={230} height={6} fill="#4a4d52" /></g>)}
      {BUILDINGS.map((b, i) => <rect key={i} x={b.x - b.w / 2} y={b.z - b.d / 2} width={b.w} height={b.d} rx={1.5} fill={b.park ? '#4c8a3a' : '#e7dcc8'} />)}
      {STREETS.ew.map((r) => <text key={r.name} x={-113} y={r.at - 3.6} fontSize={3.4} fill="#fff" stroke="#000" strokeWidth={0.5} paintOrder="stroke">{r.name}</text>)}
      {STREETS.ns.map((r) => <text key={r.name} x={r.at + 1} y={-112} fontSize={3.4} fill="#fff" stroke="#000" strokeWidth={0.5} paintOrder="stroke" transform={`rotate(90 ${r.at + 1} -112)`}>{r.name}</text>)}
      <rect x={HOME_B.x - 11} y={HOME_B.z - 9} width={22} height={18} rx={1.5} fill="#2e8b57" /><rect x={WORK_B.x - 11} y={WORK_B.z - 9} width={22} height={18} rx={1.5} fill="#4a6fa5" />
      <text x={HOME_B.x} y={HOME_B.z + 3} fontSize={11} textAnchor="middle">🏠</text><text x={WORK_B.x} y={WORK_B.z + 3} fontSize={11} textAnchor="middle">💼</text><text x={10} y={25} fontSize={9} textAnchor="middle">🍛</text>
      <circle cx={at[0]} cy={at[1]} r={7} fill="#f5b700" opacity={0.35} /><circle cx={at[0]} cy={at[1]} r={3.6} fill="#f5b700" stroke="#fff" strokeWidth={1.2} />
    </svg>
    <div className="text-center text-xs text-cream/60">{loc === 'outside' ? `The yellow dot is you · ${districtAt(rt.x, rt.z)}` : `You're indoors (${loc === 'home' ? 'home' : 'work'}).`}</div>
    <div className="space-y-2">{SPOTS.map((s) => <Pill key={s.id} className="flex w-full items-center justify-center gap-2" onClick={() => walkTo(s.id)}><span>{s.icon}</span>{s.name}</Pill>)}</div>
  </div>);
}
function CalendarApp() {
  const me = useGame((s) => s.me)!, m = useGameMinutes(), d = lagosDate(), job = me.job;
  const y = d.getUTCFullYear(), mo = d.getUTCMonth(), lead = new Date(Date.UTC(y, mo, 1)).getUTCDay(), n = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(0), ...Array.from({ length: n }, (_, i) => i + 1)];
  return (<div className="space-y-3 text-sm">
    <Card><div className="text-xs text-cream/60">Today · Lagos time</div><div className="text-lg font-bold">{DAYS[d.getUTCDay()]}, {d.getUTCDate()} {MONTHS[mo]}</div><div className="text-xs text-cream/70">{clock12(m)}</div></Card>
    <Card><div className="mb-2 text-center text-xs font-semibold">{MONTHS[mo]} {y}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => <div key={i} className="text-cream/50">{x}</div>)}
        {cells.map((c, i) => <div key={i} className={c === d.getUTCDate() ? 'rounded-full bg-gold font-bold text-ink' : ''}>{c || ''}</div>)}</div></Card>
    <Card className="space-y-1 text-xs">{job ? <div>💼 {job.title}: shifts start {hour12(job.startHour)}–{job.endHour === 24 ? 'any time' : hour12(job.endHour)} · {job.shiftsToday}/{job.shiftsPerDay} done today</div> : <div>💼 No job yet. Look in the Jobs app.</div>}<div>🕐 The game runs on real Lagos time.</div></Card>
  </div>);
}
const GRAPHICS: [Quality, string, string][] = [['low', 'Battery saver', 'Smoothest on older phones'], ['medium', 'Balanced', 'Good looks, good speed'], ['high', 'Best looking', 'Shadows and sharpest picture']];
function SettingsApp() {
  const me = useGame((s) => s.me)!, q = useGame((s) => s.quality), setQuality = useGame((s) => s.setQuality), say = useGame((s) => s.say);
  const logout = async () => { try { await api('/auth/logout', { body: {} }); } catch { /* leave anyway */ } say('Logged out.'); window.location.assign('/'); };
  return (<div className="space-y-3 text-sm">
    <div className="text-xs font-semibold uppercase tracking-wide text-cream/60">Graphics</div>
    {GRAPHICS.map(([k, name, sub]) => <button key={k} onClick={() => setQuality(k)} className={`tap flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left ${q === k ? 'bg-naija/60 ring-1 ring-gold' : 'bg-white/5'}`}><span><span className="block font-semibold">{name}</span><span className="text-xs text-cream/60">{sub}</span></span>{q === k && <span>✓</span>}</button>)}
    <p className="text-[11px] text-cream/50">If the game ever feels slow, pick Battery saver.</p>
    <div className="text-xs font-semibold uppercase tracking-wide text-cream/60">Account</div>
    <Card className="text-xs"><div className="text-sm font-semibold">{me.name}</div><div>{me.socialClass} · {me.homeName}</div><div className="mt-1 text-cream/50">Version {process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'}</div></Card>
    <Pill className="w-full !from-red-500 !to-red-700" onClick={logout}>Log out</Pill>
  </div>);
}
const VIEW: Record<AppKey, () => ReactNode> = { bank: BankApp, jobs: JobsApp, chat: ChatApp, market: MarketApp, bag: BagApp, contacts: ContactsApp, map: MapApp, calendar: CalendarApp, settings: SettingsApp };

export default function Phone() {
  const open = useGame((s) => s.phone), app = useGame((s) => s.app), openApp = useGame((s) => s.openApp), toggle = useGame((s) => s.togglePhone), me = useGame((s) => s.me);
  if (!open || !me) return null;
  const View = app ? VIEW[app] : null;
  return (
    <div className="sheet fixed inset-x-3 bottom-20 z-30 mx-auto flex h-[min(76vh,40rem)] max-w-[21rem] flex-col overflow-hidden rounded-[2.2rem] border-[6px] border-[#16191a] bg-[#07110c] shadow-2xl sm:inset-x-auto sm:right-4 sm:mx-0">
      <StatusBar />
      <div className="min-h-0 flex-1">
        {View ? (<div className="flex h-full flex-col">
          <div className="flex items-center gap-1 px-2 pb-1"><button aria-label="Back" onClick={() => openApp(null)} className="tap grid h-9 w-9 place-items-center rounded-full text-xl active:bg-white/10">‹</button><h2 className="text-base font-bold">{TITLE[app!]}</h2></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3"><View /></div>
        </div>) : <HomeScreen />}
      </div>
      <button aria-label="Home" onClick={() => (app ? openApp(null) : toggle())} className="tap grid h-7 shrink-0 place-items-center"><span className="h-1 w-24 rounded-full bg-white/60" /></button>
    </div>);
}
