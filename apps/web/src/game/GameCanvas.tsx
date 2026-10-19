'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerformanceMonitor, RoundedBox, Sky, Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { gameMinutes } from '../../../../packages/game-core/src/clock';
import { SOLID_BOXES } from '../../../../packages/game-core/src/world';
import { Avatar, type Ctrl, type Look } from './Avatar';
import { Building } from './Buildings';
import { cam, camLimits, clamp } from './camera';
import { available, interact, keys, lerpAngle, moveTo, rt, tapObject, tick } from './controller';
import { findPath } from './nav';
import { lookFor, peers, startNet } from './net';
import type { PostureName } from './postures';
import { Bench, Danfo, LampPost, Mango, MarketStall, Palm, Pole } from './Props';
import { QUALITY, useGame, type Guest } from './store';
import { asphalt, carpet, concrete, grass, laterite, litMats, paintTex, rep, wood } from './textures';
import { BUILDINGS, HOME_B, INTERACTABLES, STREETS, WORK_B, blocked, type Interactable } from './world';

type V3 = [number, number, number];
const PLAYER: Look = { skin: 0x6f4529, shirt: 0xf1ede4, pants: 0x1f2f4a, hair: 0x111111, hairStyle: 'short' };
const NPC_LOOKS = Array.from({ length: 12 }, (_, i) => lookFor('npc' + i));
const Label = ({ p, t }: { p: V3; t: string }) => (<Html position={p} center distanceFactor={16} style={{ pointerEvents: 'none' }}><div style={{ background: '#000a', color: '#fff', padding: '2px 9px', borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap' }}>{t}</div></Html>);
const RB = ({ p, s, c, r = 0.8, m = 0, rad = 0.04, rot }: { p: V3; s: V3; c: number; r?: number; m?: number; rad?: number; rot?: V3 }) => (
  <RoundedBox args={s} radius={Math.min(rad, Math.min(...s) / 2.1)} smoothness={3} position={p} rotation={rot} castShadow receiveShadow><meshStandardMaterial color={c} roughness={r} metalness={m} /></RoundedBox>);
const Plane = ({ p, s, map, rough = 1, rot = -Math.PI / 2, color }: { p: V3; s: [number, number]; map?: THREE.Texture; rough?: number; rot?: number; color?: number }) => (
  <mesh position={p} rotation={[rot, 0, 0]} receiveShadow><planeGeometry args={s} /><meshStandardMaterial map={map} color={color} roughness={rough} /></mesh>);

/* ---------------- player, camera rig, input ---------------- */
function Player() {
  const ref = useRef<THREE.Group>(null), ctrl = useRef<Ctrl>({ posture: 'stand', speed: 0 }), prev = useRef(rt.loc);
  const { camera } = useThree();
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); tick(dt);
    ctrl.current.posture = rt.posture; ctrl.current.speed = rt.speed;
    ref.current?.position.set(rt.x, 0, rt.z); if (ref.current) ref.current.rotation.y = rt.yaw;
    const inside = rt.loc !== 'outside', L = camLimits(inside);
    if (prev.current !== rt.loc) { cam.yaw = cam.yawT = 0; cam.pitch = cam.pitchT = 0.95; cam.dist = cam.distT = cam.eff = inside ? 9 : 16; cam.fx = rt.x; cam.fz = rt.z; prev.current = rt.loc; }
    cam.yawT = clamp(cam.yawT, L.yaw[0], L.yaw[1]); cam.pitchT = clamp(cam.pitchT, L.pitch[0], L.pitch[1]); cam.distT = clamp(cam.distT, L.dist[0], L.dist[1]);
    const k = 1 - Math.exp(-8 * dt);
    cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k; cam.dist += (cam.distT - cam.dist) * k;
    const kf = 1 - Math.exp(-9 * dt); cam.fx += (rt.x - cam.fx) * kf; cam.fz += (rt.z - cam.fz) * kf; // smooth follow, never stiff
    const cp = Math.cos(cam.pitch), dx = Math.sin(cam.yaw) * cp, dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * cp, hy = 1.4;
    let d = cam.dist;
    if (!inside) for (let t = 1.5; t <= d; t += 0.5) { // pull the camera in if a building would be between us and the player
      const px = cam.fx + dx * t, py = hy + dy * t, pz = cam.fz + dz * t;
      if (SOLID_BOXES.some((b) => Math.abs(px - b.x) < b.hw + 0.3 && Math.abs(pz - b.z) < b.hd + 0.3 && py < b.h)) { d = Math.max(2.5, t - 0.8); break; }
    }
    cam.eff += (d - cam.eff) * (1 - Math.exp(-(d < cam.eff ? 18 : 5) * dt));
    camera.position.set(cam.fx + dx * cam.eff, hy + dy * cam.eff, cam.fz + dz * cam.eff); camera.lookAt(cam.fx, 1.2, cam.fz);
  });
  return <group ref={ref}><Avatar ctrl={ctrl} look={PLAYER} /></group>;
}
/** Mouse + touch: tap = walk there · drag = orbit · pinch / wheel = zoom. */
function InputLayer() {
  const { gl, camera, scene } = useThree();
  useEffect(() => {
    const el = gl.domElement; el.style.touchAction = 'none';
    const ptrs = new Map<number, { x: number; y: number }>(); let down: { t: number; x: number; y: number; moved: boolean } | null = null, pinch = 0;
    const rc = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), out = new THREE.Vector3(), ndc = new THREE.Vector2();
    const L = () => camLimits(rt.loc !== 'outside');
    const box = new THREE.Box3(), hitPt = new THREE.Vector3();
    const tap = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); rc.setFromCamera(ndc, camera);
      // 1) Did the tap land on an object? Cheap ray-vs-box tests (no scene-wide raycast), nearest box wins.
      let best: Interactable | null = null, bd = Infinity;
      for (const it of INTERACTABLES) {
        if (it.loc !== rt.loc || !it.hit || !available(it)) continue;
        const [x, z, hw, hd, h] = it.hit; box.min.set(x - hw, 0, z - hd); box.max.set(x + hw, h, z + hd);
        if (rc.ray.intersectBox(box, hitPt)) { const d = hitPt.distanceTo(rc.ray.origin); if (d < bd) { bd = d; best = it; } }
      }
      if (best) { tapObject(best); return; }
      // 2) Otherwise walk there. Outdoors a tapped wall/roof walks to the pavement beside it; indoors the floor is all there is.
      if (rt.loc !== 'outside') { if (rc.ray.intersectPlane(plane, out)) moveTo(out.x, out.z); return; }
      const hit = rc.intersectObjects(scene.children, true).find((h) => h.distance < 160 && h.point.y > 0.2 && (h.object as THREE.Mesh).isMesh);
      if (hit) moveTo(hit.point.x, hit.point.z); else if (rc.ray.intersectPlane(plane, out)) moveTo(out.x, out.z);
    };
    const dn = (e: PointerEvent) => { el.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) down = { t: performance.now(), x: e.clientX, y: e.clientY, moved: false }; else { down = null; const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } };
    const mv = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) { const l = L(); cam.distT = clamp(cam.distT * (pinch / d), l.dist[0], l.dist[1]); } pinch = d; return; }
      if (!down) return; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 14) down.moved = true;
      if (down.moved) { const l = L(); cam.yawT = clamp(cam.yawT - dx * 0.008, l.yaw[0], l.yaw[1]); cam.pitchT = clamp(cam.pitchT + dy * 0.005, l.pitch[0], l.pitch[1]); }
    };
    const up = (e: PointerEvent) => { const isTap = ptrs.size === 1 && down && !down.moved && performance.now() - down.t < 650; ptrs.delete(e.pointerId); if (isTap) tap(e.clientX, e.clientY); if (ptrs.size < 2) pinch = 0; if (!ptrs.size) down = null; };
    const cancel = (e: PointerEvent) => { ptrs.delete(e.pointerId); down = null; pinch = 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const l = L(); cam.distT = clamp(cam.distT * (1 + Math.sign(e.deltaY) * 0.1), l.dist[0], l.dist[1]); };
    el.addEventListener('pointerdown', dn); el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel); el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', dn); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); el.removeEventListener('wheel', wheel); };
  }, [gl, camera, scene]);
  return null;
}
function TapMarker() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { const m = ref.current; if (!m) return; const d = rt.dest; m.visible = !!d; if (d) { m.position.set(d[0], 0.09, d[1]); const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.12; m.scale.set(s, s, s); } });
  return <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}><ringGeometry args={[0.35, 0.5, 32]} /><meshBasicMaterial color={0xffffff} transparent opacity={0.9} depthWrite={false} /></mesh>;
}
/** Only the object you tapped is highlighted, and only while its menu is open. */
function Selected() {
  const id = useGame((s) => s.menu), ref = useRef<THREE.Mesh>(null), it = id ? INTERACTABLES.find((i) => i.id === id) : null;
  useFrame(({ clock }) => { const k = 1 + Math.sin(clock.elapsedTime * 5) * 0.05; ref.current?.scale.set(k, k, k); });
  if (!it?.hit) return null;
  const [x, z, hw, hd] = it.hit, r = Math.max(hw, hd) + 0.25;
  return <mesh ref={ref} position={[x, 0.1, z]} rotation-x={-Math.PI / 2}><ringGeometry args={[r, r + 0.14, 40]} /><meshBasicMaterial color={0xf5b700} transparent opacity={0.9} depthWrite={false} /></mesh>;
}
/** Lowers the render resolution on its own if the phone can't keep up, and raises it again when it can. */
function Perf({ max, set }: { max: number; set: (f: (c: number) => number) => void }) {
  return <PerformanceMonitor onDecline={() => set((c) => Math.max(1, +(c - 0.25).toFixed(2)))} onIncline={() => set((c) => Math.min(max, +(c + 0.25).toFixed(2)))} />;
}

/* ---------------- people ---------------- */
function StaticNpc({ x, z, yaw, posture, look }: { x: number; z: number; yaw: number; posture: PostureName; look: Look }) {
  const ctrl = useRef<Ctrl>({ posture, speed: 0 });
  return <group position={[x, 0, z]} rotation={[0, yaw, 0]}><Avatar ctrl={ctrl} look={look} /></group>;
}
function Wanderer({ i }: { i: number }) {
  const ref = useRef<THREE.Group>(null), ctrl = useRef<Ctrl>({ posture: 'stand', speed: 0 });
  const s = useRef({ x: ((i * 37) % 160) - 80, z: ((i * 53) % 160) - 80, tx: 0, tz: 0, wait: i, yaw: 0 });
  useFrame((_, dt) => {
    const n = s.current; n.wait -= dt;
    if (n.wait <= 0) { n.tx = Math.max(-100, Math.min(100, n.x + (Math.random() - 0.5) * 60)); n.tz = Math.max(-100, Math.min(100, n.z + (Math.random() - 0.5) * 60)); n.wait = 4 + Math.random() * 6; }
    const ax = n.tx - n.x, az = n.tz - n.z, l = Math.hypot(ax, az); ctrl.current.speed = 0;
    if (l > 1 && n.wait < 12) { const nx = n.x + (ax / l) * 2.4 * dt, nz = n.z + (az / l) * 2.4 * dt; if (!blocked(nx, nz)) { n.x = nx; n.z = nz; n.yaw = Math.atan2(ax, az); ctrl.current.speed = 2.4; } else n.wait = 0; }
    ref.current?.position.set(n.x, 0, n.z); if (ref.current) ref.current.rotation.y = n.yaw;
  });
  return <group ref={ref}><Avatar ctrl={ctrl} look={NPC_LOOKS[i % NPC_LOOKS.length]} /></group>;
}
function Remote({ id }: { id: string }) {
  const ref = useRef<THREE.Group>(null), ctrl = useRef<Ctrl>({ posture: 'stand', speed: 0 }), cur = useRef({ x: NaN, z: 0, yaw: 0 });
  const look = useMemo(() => lookFor(id), [id]);
  useFrame((_, dt) => { // smooth the 10Hz snapshots
    const p = peers.get(id), c = cur.current; if (!p || !ref.current) return;
    if (Number.isNaN(c.x)) { c.x = p.x; c.z = p.z; c.yaw = p.yaw; }
    const k = 1 - Math.exp(-12 * dt); c.x += (p.x - c.x) * k; c.z += (p.z - c.z) * k; c.yaw = lerpAngle(c.yaw, p.yaw, k);
    ref.current.position.set(c.x, 0, c.z); ref.current.rotation.y = c.yaw; ctrl.current.posture = p.posture; ctrl.current.speed = p.speed;
  });
  return <group ref={ref}><Avatar ctrl={ctrl} look={look} /><Label p={[0, 2.6, 0]} t={peers.get(id)?.name ?? ''} /></group>;
}
function Peers() { const ids = useGame((s) => s.peers); return <>{ids.map((id) => <Remote key={id} id={id} />)}</>; }

/* ---------------- street name poles ---------------- */
const plates = new Map<string, THREE.CanvasTexture>();
function plateTexture(name: string) {
  let t = plates.get(name); if (t) return t;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#0b4f8a'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112); // blue plate, white border and lettering
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; let size = 58; g.font = `bold ${size}px Arial, sans-serif`;
  while (g.measureText(name).width > 460 && size > 20) { size -= 2; g.font = `bold ${size}px Arial, sans-serif`; }
  g.fillText(name, 256, 66);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; plates.set(name, t); return t;
}
/** The standard roadside street-name pole: a steel pole with a blue plate, readable from both sides. */
function StreetSign({ p, name }: { p: V3; name: string }) {
  const tex = useMemo(() => plateTexture(name), [name]);
  return (<group position={p}>
    <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.06, 0.07, 3.4, 8]} /><meshStandardMaterial color={0x6b6f73} metalness={0.6} roughness={0.5} /></mesh>
    <mesh position={[0, 3.2, 0]}><boxGeometry args={[2.5, 0.65, 0.06]} /><meshStandardMaterial color={0x0b4f8a} roughness={0.6} /></mesh>
    <mesh position={[0, 3.2, 0.035]}><planeGeometry args={[2.4, 0.6]} /><meshBasicMaterial map={tex} /></mesh>
    <mesh position={[0, 3.2, -0.035]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.4, 0.6]} /><meshBasicMaterial map={tex} /></mesh>
  </group>);
}
/** One pole at the start and one at the end of every street. */
function StreetSigns() {
  const E = 108;
  return (<>
    {STREETS.ns.flatMap((r) => [-E, E].map((z) => <StreetSign key={`n${r.at}${z}`} p={[r.at + 3.9, 0.07, z]} name={r.name} />))}
    {STREETS.ew.flatMap((r) => [-E, E].map((x) => <StreetSign key={`e${r.at}${x}`} p={[x, 0.07, r.at + 3.9]} name={r.name} />))}
  </>);
}

/* ---------------- outdoors ---------------- */
function Outdoors() {
  const npcs = useGame((s) => QUALITY[s.quality].npcs);
  const t = useMemo(() => ({ ground: rep(laterite(), 26, 26), v: rep(asphalt(false), 1, 21.7), h: rep(asphalt(true), 21.7, 1), sw: rep(concrete(), 1, 108), swh: rep(concrete(), 108, 1), park: rep(grass(), 6, 6) }), []);
  const R = [-100, -60, -20, 20, 60, 100];
  return (<>
    <Plane p={[0, -0.02, 0]} s={[260, 260]} map={t.ground} />
    {R.map((v) => (<group key={v}>
      <Plane p={[v, 0.03, 0]} s={[6, 260]} map={t.v} rough={0.95} /><Plane p={[0, 0.04, v]} s={[260, 6]} map={t.h} rough={0.95} />
      {[-3.9, 3.9].map((o) => <group key={o}><Plane p={[v + o, 0.07, 0]} s={[1.8, 260]} map={t.sw} /><Plane p={[0, 0.07, v + o]} s={[260, 1.8]} map={t.swh} /></group>)}</group>))}
    {BUILDINGS.map((b, i) => b.park ? (<group key={i}><Plane p={[b.x, 0.05, b.z]} s={[b.w, b.d]} map={t.park} />
      <Palm p={[b.x - 7, 0, b.z - 6]} s={1.1} /><Palm p={[b.x + 8, 0, b.z + 5]} tilt={-0.07} /><Mango p={[b.x + 5, 0, b.z - 7]} /><Mango p={[b.x - 6, 0, b.z + 6]} s={0.85} /></group>)
      : <Building key={i} b={b} />)}
    <Building b={HOME_B} special={{ sign: 'No. 14 · Ajayi Close', door: 0x2e6b3f, paint: 0xe9d9b8 }} />
    <Building b={WORK_B} special={{ sign: 'ADEBAYO & CO. LTD', door: 0x1d3f66, paint: 0x9fb7c9, glassy: true }} />
    <Label p={[HOME_B.x, 14, HOME_B.z]} t="HOME" /><Label p={[WORK_B.x, 14, WORK_B.z]} t="WORKPLACE" />
    {[-60, -20, 20, 60].flatMap((x) => [-60, -20, 20, 60].map((z) => <Pole key={`${x}${z}`} p={[x + 4.4, 0, z + 12]} />))}
    {[-100, -60, -20, 20, 60, 100].map((x) => <LampPost key={x} p={[x - 4.4, 0, 54]} />)}
    <StreetSigns />
    <Danfo p={[18.6, 0, 12]} /><Danfo p={[-61.4, 0, -26]} color={0xe8a900} /><Danfo p={[30, 0, 19.2]} r={Math.PI / 2} /><Danfo p={[-30, 0, 60.8]} r={-Math.PI / 2} color={0xe8a900} />
    <MarketStall p={[10, 0, 22]} /><Label p={[10, 4.2, 22]} t="Market" />
    <Bench p={[-28, 0, 53]} /><Bench p={[-52, 0, 53]} />
    <StaticNpc x={-52} z={53} yaw={0} posture="sit" look={NPC_LOOKS[2]} /><StaticNpc x={13} z={24.6} yaw={Math.PI} posture="eat" look={NPC_LOOKS[4]} />
    {Array.from({ length: npcs }, (_, i) => <Wanderer key={i} i={i} />)}
  </>);
}

/* ---------------- interiors ---------------- */
function Room({ cx, kind, power, tint = 0xffe2b0, bulb = true }: { cx: number; kind: 'home' | 'office'; power?: number; tint?: number; bulb?: boolean }) {
  const shadow = useGame((s) => QUALITY[s.quality].roomShadow);
  const floor = useMemo(() => (kind === 'home' ? rep(wood(), 5, 5) : rep(carpet(), 12, 12)), [kind]), wall = useMemo(() => rep(paintTex(kind === 'home' ? 0xe9dcc4 : 0xdde4e8), 3, 1), [kind]);
  return (<>
    <Plane p={[cx, 0, 0]} s={[12, 12]} map={floor} rough={kind === 'home' ? 0.55 : 0.95} />
    {([[cx, 2, -6, 12, 4, 0.3], [cx - 6, 2, 0, 0.3, 4, 12], [cx + 6, 2, 0, 0.3, 4, 12]] as number[][]).map(([x, y, z, w, h, d], i) => (
      <mesh key={i} position={[x, y, z]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>))}
    <RB p={[cx, 0.07, -5.82]} s={[12, 0.14, 0.1]} c={0xf4f1ea} /><RB p={[cx - 5.82, 0.07, 0]} s={[0.1, 0.14, 12]} c={0xf4f1ea} /><RB p={[cx + 5.82, 0.07, 0]} s={[0.1, 0.14, 12]} c={0xf4f1ea} />
    <pointLight position={[cx, 3.6, 0]} intensity={power ?? (kind === 'home' ? 26 : 34)} distance={18} decay={2} color={tint} castShadow={shadow} shadow-mapSize={[512, 512]} shadow-bias={-0.001} />
    {bulb && <mesh position={[cx, 3.95, 0]}><cylinderGeometry args={[0.3, 0.3, 0.1, 20]} /><meshStandardMaterial color={0xfff6dc} emissive={0xffe6a8} emissiveIntensity={1.5} /></mesh>}
    <RB p={[cx, 0.02, 5.2]} s={[2, 0.04, 0.8]} c={0x6b4a2b} r={1} />
  </>);
}
const Window = ({ p, rot = 0, w = 2.4 }: { p: V3; rot?: number; w?: number }) => (<group position={p} rotation={[0, rot, 0]}>
  <RB p={[0, 0, 0]} s={[w + 0.2, 1.6, 0.08]} c={0xf4f1ea} /><mesh position={[0, 0, 0.05]}><planeGeometry args={[w, 1.4]} /><meshStandardMaterial color={0xbfe3ff} emissive={0x9fd3f2} emissiveIntensity={0.9} /></mesh>
  <RB p={[0, 0, 0.07]} s={[0.05, 1.4, 0.04]} c={0xf4f1ea} /></group>);
const BED = [
  { frame: 0x5b5b58, fh: 0.1, mh: 0.1, mc: 0x8a9a86, sheet: 0xb9b19c, pillows: 1, head: 0, w: 1.7, fm: 0.6 },
  { frame: 0x6b4a2b, fh: 0.25, mh: 0.18, mc: 0xcfd3c8, sheet: 0xe0dccd, pillows: 1, head: 0.5, w: 1.8, fm: 0 },
  { frame: 0x4a2f1b, fh: 0.3, mh: 0.24, mc: 0xf2efe8, sheet: 0x2e5e8c, pillows: 2, head: 1, w: 1.9, fm: 0 },
  { frame: 0x2c2c30, fh: 0.3, mh: 0.28, mc: 0xf5f2ec, sheet: 0x3d3d4a, pillows: 2, head: 1.3, w: 2.0, fm: 0 },
  { frame: 0x1a1a1e, fh: 0.3, mh: 0.3, mc: 0xfaf7f0, sheet: 0x7a2b3a, pillows: 3, head: 1.6, w: 2.1, fm: 0 },
];
const LIGHT_POWER = [7, 12, 20, 26, 28, 32], LIGHT_TINT = [0xffb361, 0xffd9a0, 0xffe6bf, 0xffe6bf, 0xffe9c8, 0xfff0d4];
const Screen = ({ w, h = w * 0.58, on = 0.55 }: { w: number; h?: number; on?: number }) => (<group>
  <RB p={[0, 0, 0]} s={[0.07, h + 0.06, w + 0.06]} c={0x0e0e10} r={0.3} /><mesh position={[-0.04, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[w, h]} /><meshStandardMaterial color={0x101a26} emissive={0x2f6aa8} emissiveIntensity={on} roughness={0.2} /></mesh></group>);
const PlasticChair = ({ p }: { p: V3 }) => (<group position={p}><RB p={[0, 0.43, 0]} s={[0.46, 0.05, 0.46]} c={0xe8e6dc} r={0.5} /><RB p={[-0.22, 0.7, 0]} s={[0.05, 0.5, 0.46]} c={0xe8e6dc} r={0.5} />{[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => <mesh key={i} position={[x, 0.2, z]}><cylinderGeometry args={[0.02, 0.02, 0.4, 6]} /><meshStandardMaterial color={0xcfcdc2} /></mesh>)}</group>);
/** The room is built from what the player OWNS: a poor character's room genuinely looks poorer, and every purchase changes it. */
function Home() {
  const rug = useMemo(() => rep(paintTex(0x8e2d2d), 1, 1), []), H = useGame((s) => s.me?.home);
  const bed = H?.bed ?? 0, light = H?.light ?? 0, tv = H?.tv ?? 0, seat = H?.seat ?? 0, fridge = H?.fridge ?? 0, cooker = H?.cooker ?? 0, cooling = H?.cooling ?? 0, B = BED[bed];
  return (<>
    <Room cx={1000} kind="home" power={LIGHT_POWER[light]} tint={LIGHT_TINT[light]} bulb={light >= 2} />
    <Window p={[994.2, 2.2, 1]} rot={Math.PI / 2} /><RB p={[994.4, 1.9, -0.6]} s={[0.12, 2.6, 0.7]} c={bed >= 1 ? 0x9a3b3b : 0xb9a98a} r={1} /><RB p={[994.4, 1.9, 2.6]} s={[0.12, 2.6, 0.7]} c={bed >= 1 ? 0x9a3b3b : 0xb9a98a} r={1} />
    {/* bed */}
    <RB p={[997.5, B.fh / 2, -4.4]} s={[B.w, B.fh, 2.4]} c={B.frame} m={B.fm} r={0.7} />
    <RB p={[997.5, B.fh + B.mh / 2, -4.4]} s={[B.w - 0.1, B.mh, 2.3]} c={B.mc} r={1} rad={0.07} />
    <RB p={[997.5, B.fh + B.mh + 0.02, -3.9]} s={[B.w - 0.08, 0.05, 1.4]} c={B.sheet} r={1} />
    {Array.from({ length: B.pillows }, (_, i) => <RB key={i} p={[997.5 + (i - (B.pillows - 1) / 2) * 0.62, B.fh + B.mh + 0.06, -5.4]} s={[0.58, bed ? 0.14 : 0.07, 0.38]} c={0xf1ede4} r={1} rad={0.07} />)}
    {B.head > 0 && <RB p={[997.5, B.head / 2 + 0.15, -5.7]} s={[B.w + 0.1, B.head, 0.12]} c={bed >= 3 ? 0x3b3f4a : B.frame} r={0.8} />}
    {bed >= 3 && [996.0, 999.0].map((x) => (<group key={x}><RB p={[x, 0.27, -5.4]} s={[0.5, 0.54, 0.45]} c={0x2c2c30} /><mesh position={[x, 0.75, -5.4]}><cylinderGeometry args={[0.1, 0.16, 0.3, 14]} /><meshStandardMaterial color={0xfff1d0} emissive={0xffd88a} emissiveIntensity={0.9} /></mesh></group>))}
    {bed >= 4 && <RB p={[997.5, 0.3, -2.9]} s={[1.9, 0.38, 0.5]} c={0x7a2b3a} r={0.9} rad={0.1} />}
    {/* clothes: plastic trunk, then a wardrobe */}
    {bed === 0 ? <RB p={[995, 0.2, -2.8]} s={[0.7, 0.4, 0.5]} c={0x3b6ea5} r={0.6} /> : <RB p={[994.8, 1.1, -2.8]} s={[0.6, 2.2, 1.3]} c={bed >= 3 ? 0x2c2c30 : 0x7a5230} r={0.6} />}
    {/* light & power */}
    {light <= 1 && (<group><RB p={[999.4, 0.25, -5.4]} s={[0.5, 0.5, 0.4]} c={0x7a5230} />{light === 0
      ? <><mesh position={[999.4, 0.68, -5.4]}><cylinderGeometry args={[0.1, 0.12, 0.3, 12]} /><meshStandardMaterial color={0xffd08a} emissive={0xffa13a} emissiveIntensity={1.4} /></mesh><mesh position={[999.4, 0.88, -5.4]}><torusGeometry args={[0.07, 0.01, 6, 14]} /><meshStandardMaterial color={0x333333} /></mesh></>
      : <mesh position={[999.4, 0.7, -5.4]}><cylinderGeometry args={[0.06, 0.08, 0.42, 12]} /><meshStandardMaterial color={0xf3f3ee} emissive={0xfff0c8} emissiveIntensity={1.1} /></mesh>}</group>)}
    {light >= 3 && <><RB p={[995.5, 0.45, -1.5]} s={[1, 0.9, 0.7]} c={0xb23a22} r={0.5} /><RB p={[995.5, 0.97, -1.5]} s={[0.9, 0.12, 0.6]} c={0x222222} /></>}
    {light >= 4 && <group position={[994.4, 1.5, -4.4]}><RB p={[0, 0, 0]} s={[0.2, 0.7, 0.5]} c={0xf1f1ee} r={0.4} /><mesh position={[0.12, 0.2, 0]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color={0x22ff66} emissive={0x22ff66} emissiveIntensity={2} /></mesh></group>}
    {light >= 5 && [0, 1].map((i) => <RB key={i} p={[1006.7, 1.1 + i * 0.05, -2 + i * 1.7]} s={[0.1, 1.5, 1.6]} c={0x14284b} r={0.25} m={0.5} rot={[0, 0, -0.5]} />)}
    {/* cooking & food */}
    {cooker === 0 ? (<><RB p={[1002, 0.35, -5.4]} s={[1.4, 0.7, 0.6]} c={0x7a5230} /><mesh position={[1001.7, 0.82, -5.4]}><cylinderGeometry args={[0.24, 0.18, 0.26, 14]} /><meshStandardMaterial color={0x1d1d1d} /></mesh><mesh position={[1001.7, 0.98, -5.4]}><cylinderGeometry args={[0.2, 0.2, 0.14, 14]} /><meshStandardMaterial color={0x8a8d91} metalness={0.8} roughness={0.35} /></mesh></>)
      : (<><RB p={[1002, 0.45, -5.4]} s={[3, 0.9, 0.7]} c={0xe6e0d2} /><RB p={[1002, 0.92, -5.4]} s={[3, 0.05, 0.72]} c={0x2a2a2a} r={0.4} /><RB p={[1001.4, 0.97, -5.4]} s={[0.8, 0.04, 0.5]} c={0x111111} r={0.3} m={0.4} /><mesh position={[1000.6, 0.3, -5.45]}><cylinderGeometry args={[0.17, 0.17, 0.6, 14]} /><meshStandardMaterial color={0xc0392b} roughness={0.5} /></mesh></>)}
    {cooker >= 2 && <RB p={[1002.9, 1.12, -5.4]} s={[0.55, 0.3, 0.4]} c={0xdcdcdc} m={0.4} r={0.4} />}
    {fridge === 0 ? (<><RB p={[1004.8, 0.25, -5.4]} s={[0.7, 0.5, 0.45]} c={0x2f7fc1} r={0.5} /><mesh position={[1004.2, 0.2, -4.9]}><cylinderGeometry args={[0.18, 0.15, 0.4, 14]} /><meshStandardMaterial color={0xd9e2ec} roughness={0.6} /></mesh></>)
      : <><RB p={[1004.8, fridge === 1 ? 0.55 : 1, -5.4]} s={[fridge === 1 ? 0.6 : 0.9, fridge === 1 ? 1.1 : 2, fridge === 1 ? 0.6 : 0.8]} c={fridge === 1 ? 0xe8e8e2 : 0xd8dde0} r={0.35} m={0.5} /><RB p={[1004.4, fridge === 1 ? 0.7 : 1.2, -4.98]} s={[0.04, 0.5, 0.04]} c={0x888888} m={0.8} /></>}
    {/* seating */}
    {seat === 0 && <PlasticChair p={[1002.2, 0, 1]} />}
    {seat >= 1 && (() => { const L = [0, 1.5, 2.3, 2.5][seat], col = [0, 0x5d6b57, 0x6b3a2a, 0x3b3f4a][seat]; return (<><RB p={[1002.3, 0.22, 1]} s={[0.95, 0.45, L]} c={col} r={seat === 3 ? 0.4 : 0.6} rad={0.1} /><RB p={[1001.75, 0.7, 1]} s={[0.28, 0.9, L]} c={col} r={seat === 3 ? 0.4 : 0.6} rad={0.1} />{seat >= 2 && <><RB p={[1002.45, 0.55, 1 - L / 4]} s={[0.7, 0.14, L / 2 - 0.15]} c={0x7d4634} r={0.6} rad={0.06} /><RB p={[1002.45, 0.55, 1 + L / 4]} s={[0.7, 0.14, L / 2 - 0.15]} c={0x7d4634} r={0.6} rad={0.06} /></>}{seat >= 3 && <RB p={[1003.7, 0.2, 1]} s={[0.6, 0.4, 1.1]} c={0x2c2c30} r={0.3} m={0.4} />}</>); })()}
    {/* entertainment */}
    {tv >= 1 && (<group position={[1005.7, 0, 1]}>{tv === 1 ? <RB p={[0, 0.25, 0]} s={[0.5, 0.5, 0.8]} c={0x7a5230} /> : <RB p={[0, 0.3, 0]} s={[0.4, 0.6, 1.8 + (tv - 2) * 0.3]} c={0x4a3320} r={0.7} />}
      <group position={[0, tv === 1 ? 0.75 : 1.3 + (tv - 2) * 0.1, 0]}><Screen w={[0, 0.7, 1.4, 1.9, 2.2][tv]} on={0.55 + tv * 0.08} /></group>
      {tv >= 4 && <><RB p={[-0.1, 0.78, 0]} s={[0.1, 0.12, 1.6]} c={0x15151a} />{[-1.4, 1.4].map((z) => <RB key={z} p={[0, 0.6, z]} s={[0.3, 1.2, 0.3]} c={0x15151a} />)}</>}</group>)}
    {tv === 0 && <RB p={[1005.6, 0.9, 0.4]} s={[0.25, 0.3, 0.15]} c={0x3b3b3b} />}
    {/* cooling */}
    {cooling === 1 && <group position={[996.8, 0.84, 4.8]}><mesh><cylinderGeometry args={[0.12, 0.14, 0.04, 14]} /><meshStandardMaterial color={0x222222} /></mesh><mesh position={[0, 0.2, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.18, 0.18, 0.04, 20]} /><meshStandardMaterial color={0xcfd8dc} transparent opacity={0.7} /></mesh></group>}
    {cooling === 2 && <group position={[995.4, 0, 2.7]}><mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.03, 0.03, 1.2, 8]} /><meshStandardMaterial color={0xcccccc} metalness={0.7} /></mesh><mesh position={[0, 1.25, 0.04]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.24, 0.24, 0.05, 22]} /><meshStandardMaterial color={0xdfe6e9} transparent opacity={0.75} /></mesh><mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.2, 0.2, 0.04, 16]} /><meshStandardMaterial color={0x222222} /></mesh></group>}
    {cooling >= 3 && <group position={[1000, 2.9, -5.78]}><RB p={[0, 0, 0]} s={[1.1, 0.32, 0.22]} c={0xf4f4f0} r={0.4} /><mesh position={[0.4, -0.04, 0.12]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color={0x33aaff} emissive={0x33aaff} emissiveIntensity={2} /></mesh></group>}
    {/* desk and bathing */}
    <RB p={[996, 0.36, 5.3]} s={[2, 0.72, 0.1]} c={0x7a5230} /><RB p={[996, 0.75, 4.9]} s={[2.1, 0.07, 0.85]} c={0x7a5230} r={0.6} />{tv >= 2 && <RB p={[996, 0.81, 4.95]} s={[0.55, 0.03, 0.38]} c={0x9a9a9a} m={0.7} r={0.3} />}
    <RB p={[996, 0.42, 3.8]} s={[0.5, 0.08, 0.5]} c={bed >= 2 ? 0x2c2c2c : 0xe8e6dc} /><RB p={[996, 0.72, 3.55]} s={[0.5, 0.55, 0.08]} c={bed >= 2 ? 0x2c2c2c : 0xe8e6dc} />
    {bed === 0 ? (<group position={[1004.2, 0, 5]}><RB p={[0, 1.1, 0.6]} s={[1.4, 2.2, 0.05]} c={0x9cc0d6} r={0.9} /><mesh position={[-0.3, 0.2, 0]}><cylinderGeometry args={[0.24, 0.2, 0.4, 16]} /><meshStandardMaterial color={0xd9462e} /></mesh></group>)
      : (<><RB p={[1004.2, 1.2, 5.75]} s={[1.7, 2.4, 0.1]} c={0xb9d6df} r={0.4} /><mesh position={[1004.2, 1.2, 4.9]}><boxGeometry args={[1.7, 2.3, 0.03]} /><meshStandardMaterial color={0xbfe3f0} transparent opacity={0.25} roughness={0.1} /></mesh><RB p={[1004.2, 2.3, 5.4]} s={[0.12, 0.08, 0.5]} c={0xcccccc} m={0.9} r={0.2} /></>)}
    <mesh position={[1000, 0.02, 0.4]} rotation-x={-Math.PI / 2}><planeGeometry args={[3, 2.4]} /><meshStandardMaterial map={rug} roughness={1} /></mesh>
  </>);
}
/** A friend you invited. They walk in from the door, sit beside you, and leave when you get up. */
function GuestBody({ g }: { g: Guest }) {
  const ref = useRef<THREE.Group>(null), ctrl = useRef<Ctrl>({ posture: 'stand', speed: 0 }), look = useMemo(() => lookFor('guest' + g.key), [g.key]);
  const s = useRef({ x: 1000, z: 5, yaw: Math.PI, path: [] as [number, number][], mode: 'in' as 'in' | 'out' });
  useEffect(() => { s.current.path = findPath('home', [s.current.x, s.current.z], [g.x - 1.3, g.z]) ?? []; }, [g.key, g.x, g.z]);
  useEffect(() => { if (!g.leaving) return; const n = s.current; n.mode = 'out'; ctrl.current.posture = 'stand'; n.path = findPath('home', [n.x, n.z], [1000, 5]) ?? [[1000, 5]]; }, [g.leaving]);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); const n = s.current, c = ctrl.current; c.speed = 0;
    if (n.path.length) {
      const [tx, tz] = n.path[0], ex = tx - n.x, ez = tz - n.z, d = Math.hypot(ex, ez), sp = 3 * dt;
      if (d <= sp + 0.02) { n.x = tx; n.z = tz; n.path.shift(); } else { n.x += (ex / d) * sp; n.z += (ez / d) * sp; n.yaw = lerpAngle(n.yaw, Math.atan2(ex, ez), 1 - Math.exp(-12 * dt)); c.speed = 3; }
      if (!n.path.length && n.mode === 'out') { const st = useGame.getState(); if (st.guest?.key === g.key) st.setGuest(null); }
    } else if (n.mode === 'in') {
      const k = 1 - Math.exp(-8 * dt), dd = Math.hypot(g.x - n.x, g.z - n.z);
      n.x += (g.x - n.x) * k; n.z += (g.z - n.z) * k; n.yaw = lerpAngle(n.yaw, dd > 0.15 ? Math.atan2(g.x - n.x, g.z - n.z) : g.yaw, 1 - Math.exp(-10 * dt));
      c.speed = dd > 0.1 ? 2 : 0; if (dd < 0.3) c.posture = 'sit';
    }
    ref.current?.position.set(n.x, 0, n.z); if (ref.current) ref.current.rotation.y = n.yaw;
  });
  return <group ref={ref} position={[1000, 0, 5]}><Avatar ctrl={ctrl} look={look} /></group>;
}
function GuestNpc() {
  const g = useGame((s) => s.guest), loc = useGame((s) => s.loc);
  if (!g || loc !== 'home') return null;
  return <>{g.chair && <PlasticChair p={[g.x, 0, g.z]} />}<GuestBody key={g.key} g={g} /></>;
}
function Office() {
  return (<>
    <Room cx={2000} kind="office" />
    <Window p={[2000, 2.4, -5.82]} w={3.6} />
    <mesh position={[2003.2, 2.9, -5.83]}><circleGeometry args={[0.3, 24]} /><meshStandardMaterial color={0xf8f8f8} /></mesh>
    {[1996, 2000, 2004].map((x) => (<group key={x}><RB p={[x, 0.36, -2.85]} s={[2.4, 0.72, 0.1]} c={0x5f4630} /><RB p={[x, 0.75, -2.4]} s={[2.5, 0.07, 1.05]} c={0x8b5a2b} r={0.55} /><RB p={[x, 1.1, -2.7]} s={[0.7, 0.42, 0.05]} c={0x0d0d0f} r={0.3} /><RB p={[x, 0.82, -2.7]} s={[0.12, 0.14, 0.1]} c={0x222222} /><RB p={[x, 0.42, -0.9]} s={[0.52, 0.08, 0.52]} c={0x2c3e50} /><RB p={[x, 0.72, -0.65]} s={[0.52, 0.55, 0.08]} c={0x2c3e50} /></group>))}
    <RB p={[2005.5, 0.5, -4]} s={[0.4, 1, 0.4]} c={0xe8eef2} r={0.4} /><RB p={[2005.5, 1.15, -4]} s={[0.34, 0.34, 0.34]} c={0x6fb5e0} r={0.2} /><RB p={[1994.8, 1, -4]} s={[0.6, 2, 0.8]} c={0x8a8f94} r={0.5} m={0.5} />
    <mesh position={[1994.8, 0.2, 3]}><cylinderGeometry args={[0.28, 0.2, 0.4, 14]} /><meshStandardMaterial color={0xb5651d} /></mesh><mesh position={[1994.8, 0.8, 3]} castShadow><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial color={0x2f7d3a} roughness={0.8} /></mesh>
    <StaticNpc x={1996} z={-1} yaw={Math.PI} posture="type" look={NPC_LOOKS[1]} /><StaticNpc x={2004} z={-1} yaw={Math.PI} posture="type" look={NPC_LOOKS[3]} />
  </>);
}

/* ---------------- sky + light ---------------- */
const NIGHT = new THREE.Color(0x0a0f1f), DAY = new THREE.Color(0xcdd8de), DUSK = new THREE.Color(0xe3a979), INDOOR = new THREE.Color(0x1b1510);
function Lighting() {
  const { scene } = useThree(), loc = useGame((s) => s.loc), Q = QUALITY[useGame((s) => s.quality)];
  const sun = useRef<THREE.DirectionalLight>(null), hemi = useRef<THREE.HemisphereLight>(null), acc = useRef(10), dir = useRef(new THREE.Vector3(1, 1, 0.35));
  const [sky, setSky] = useState<{ pos: V3; night: boolean }>({ pos: [100, 80, 30], night: false });
  const fog = useMemo(() => new THREE.Color(), []);
  useEffect(() => { const s = sun.current; if (s) scene.add(s.target); return () => { if (s) scene.remove(s.target); }; }, [scene]);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current > 0.4) {
      acc.current = 0; const inside = rt.loc !== 'outside', h = (gameMinutes() / 60) % 24, t = ((h - 6) / 12) * Math.PI, el = Math.sin(t);
      dir.current.set(Math.cos(t), Math.max(el, 0.05), 0.35).normalize();
      const day = clamp(el * 1.6, 0, 1), low = clamp(1 - Math.abs(el) * 2.2, 0, 1);
      fog.copy(NIGHT).lerp(DAY, day); if (el > 0) fog.lerp(DUSK, low * 0.7);
      const bg = inside ? INDOOR : fog; scene.background = bg; scene.fog = new THREE.Fog(bg.getHex(), inside ? 30 : 70, inside ? 60 : 230);
      if (sun.current) { sun.current.castShadow = Q.shadows && !inside; sun.current.color.set(el > 0 ? 0xfff1d8 : 0x7f95d6).lerp(new THREE.Color(0xff9a52), el > 0 ? low * 0.8 : 0); sun.current.intensity = inside ? 0 : el > 0 ? 2.8 * Math.min(1, el * 2.5) : 0.15; }
      if (hemi.current) hemi.current.intensity = inside ? 0.7 : 0.2 + 0.75 * day;
      const glow = !inside && el < 0.1 ? 1.3 : 0; litMats.forEach((m) => { m.emissiveIntensity = glow; }); // windows light up at night
      setSky({ pos: [dir.current.x * 400, dir.current.y * 400, dir.current.z * 400], night: el < 0.05 });
    }
    const s = sun.current; if (s) { s.position.set(rt.x + dir.current.x * 70, dir.current.y * 70 + 10, rt.z + dir.current.z * 70); s.target.position.set(rt.x, 0, rt.z); s.target.updateMatrixWorld(); }
  });
  return (<>
    {loc === 'outside' && <Sky sunPosition={sky.pos} turbidity={6} rayleigh={sky.night ? 0.1 : 1.4} mieCoefficient={0.005} mieDirectionalG={0.85} />}
    {loc === 'outside' && sky.night && <Stars radius={180} depth={60} count={2500} factor={5} fade />}
    <hemisphereLight ref={hemi} args={[0xcfe3ff, 0x5a4630, 0.9]} />
    <directionalLight ref={sun} castShadow={Q.shadows} shadow-mapSize={[Q.shadowMap, Q.shadowMap]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-near={1} shadow-camera-far={200} shadow-bias={-0.0004} shadow-normalBias={0.05} />
  </>);
}
function Scene() {
  const loc = useGame((s) => s.loc); // only the CURRENT place is mounted; hidden interiors are never rendered
  return (<><Lighting /><Player /><InputLayer /><TapMarker /><Selected /><Peers /><GuestNpc />{loc === 'outside' && <Outdoors />}{loc === 'home' && <Home />}{loc === 'office' && <Office />}</>);
}
export default function GameCanvas() {
  const q = useGame((s) => s.quality), Q = QUALITY[q], [cap, setCap] = useState(Q.dpr);
  useEffect(() => { setCap(Q.dpr); }, [Q.dpr]);
  useEffect(() => startNet(), []);
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase(), st = useGame.getState(); keys[k] = true;
      if (k === 'e') interact(); if (k === 'p') st.togglePhone();
      if (k === 'escape') { st.openMenu(null); if (st.phone) st.togglePhone(); }
      if (k === 'enter') { e.preventDefault(); st.openApp('chat'); setTimeout(() => document.getElementById('chat-input')?.focus(), 120); }
    };
    const up = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    addEventListener('keydown', dn); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', dn); removeEventListener('keyup', up); };
  }, []);
  return (<Canvas key={q} shadows={Q.shadows} dpr={[1, cap]} gl={{ antialias: Q.aa, powerPreference: 'high-performance' }} camera={{ fov: 55, near: 0.5, far: 400, position: [-40, 16, 67] }} style={{ position: 'fixed', inset: 0, touchAction: 'none' }}><Perf max={Q.dpr} set={setCap} /><Scene /></Canvas>);
}
