import React, {useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {Easing, interpolate} from 'remotion';
import * as THREE from 'three';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {useGeometry} from './assets';
import {Settle} from './Settle';
import {CAR, DCT, ENGINE, SHAFT, TRANSAXLE, engineMatrix} from './layout';
import {PAL, SHADOW_MATRIX, edgesOf, inkLines, setToon, shadowMaterial, toon} from './look';
import {T, applyPose, gearAt, poseAt, sinceShift} from './timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const prepEngine = (g: THREE.BufferGeometry) => {
  g.computeVertexNormals();
  g.computeBoundingBox();
  // Centre the kit on its bounding box so ENGINE.centre places it.
  const c = new THREE.Vector3();
  g.boundingBox!.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
};

// A part = toon fill + ink outline (+ optional floor shadow), sharing one transform.
type Part = {group: THREE.Group; fill: THREE.ShaderMaterial; lines: LineMaterial; shadow?: THREE.Mesh};

const makePart = (geo: THREE.BufferGeometry, base: string, opts: {threshold?: number; width?: number; shadow?: boolean} = {}): Part => {
  const group = new THREE.Group();
  const fill = toon(base);
  group.add(new THREE.Mesh(geo, fill));
  const l = inkLines(edgesOf(geo, opts.threshold ?? 30), opts.width ?? 1.6);
  group.add(l);
  let shadow: THREE.Mesh | undefined;
  if (opts.shadow !== false) {
    shadow = new THREE.Mesh(geo, shadowMaterial);
    shadow.matrixAutoUpdate = false;
    shadow.renderOrder = 0;
  }
  return {group, fill, lines: l.material as LineMaterial, shadow};
};

const cylX = (r: number, len: number, seg = 28) => {
  // Cylinder along -x from the origin (so scale.x reveals it from its start).
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(-len / 2, 0, 0);
  return g;
};

const ring = (r: number, n = 48) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    out.push(r * Math.cos(a0), r * Math.sin(a0), 0, r * Math.cos(a1), r * Math.sin(a1), 0);
  }
  return out;
};

// Wire tyre: two sidewall rings, two rim rings and tread lines across the width.
const wireTyre = (r: number, w: number) => {
  const out: number[] = [];
  const n = 48;
  for (const z of [-w / 2, w / 2]) {
    for (const rr of [r, r * 0.7]) {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        out.push(rr * Math.cos(a0), rr * Math.sin(a0), z, rr * Math.cos(a1), rr * Math.sin(a1), z);
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    out.push(r * Math.cos(a), r * Math.sin(a), -w / 2, r * Math.cos(a), r * Math.sin(a), w / 2);
  }
  return out;
};

// Transaxle housing: a side profile (bell -> case -> diff hump) extruded across the car, bevelled.
const housing = () => {
  const s = new THREE.Shape();
  const P: [number, number][] = [
    [-0.98, 0.27], [-0.98, 0.52], [-1.08, 0.6], [-1.5, 0.63], [-1.64, 0.55], [-1.68, 0.4], [-1.6, 0.24], [-1.1, 0.21],
  ];
  s.moveTo(P[0][0], P[0][1]);
  P.slice(1).forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: 0.36, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2});
  g.translate(0, 0, -0.18);
  return g;
};

const buildStatic = () => {
  const root = new THREE.Group();
  const shadows = new THREE.Group();
  const parts: Record<string, Part> = {};
  const add = (name: string, p: Part, parent: THREE.Object3D = root) => {
    parts[name] = p;
    parent.add(p.group);
    if (p.shadow) shadows.add(p.shadow);
    return p;
  };

  // Floor: grid, footprint, centreline.
  const grid = new THREE.GridHelper(14, 56, new THREE.Color('#d2ccbf'), new THREE.Color('#dcd7cc'));
  root.add(grid);
  const fp: number[] = [];
  const corner = 0.32;
  const pts: [number, number][] = [];
  const addArc = (cx: number, cz: number, a0: number) => {
    for (let k = 0; k <= 8; k++) {
      const a = a0 + (k / 8) * (Math.PI / 2);
      pts.push([cx + corner * Math.cos(a), cz + corner * Math.sin(a)]);
    }
  };
  const hw = CAR.width / 2;
  addArc(CAR.front - corner, hw - corner, 0);
  addArc(CAR.rear + corner, hw - corner, Math.PI / 2);
  addArc(CAR.rear + corner, -hw + corner, Math.PI);
  addArc(CAR.front - corner, -hw + corner, (3 * Math.PI) / 2);
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    fp.push(p[0], 0.003, p[1], q[0], 0.003, q[1]);
  });
  for (let x = CAR.rear; x < CAR.front; x += 0.24) fp.push(x, 0.003, 0, Math.min(x + 0.12, CAR.front), 0.003, 0);
  const footprint = inkLines(fp, 1.3, PAL.steel);
  root.add(footprint);

  // Wheels: tyre + rim rings.
  for (const [ax, tr] of [
    [CAR.axleF, CAR.trackF],
    [CAR.axleR, CAR.trackR],
  ]) {
    for (const s of [-1, 1]) {
      // Wheels stay wireframe: context, never in the way of the drivetrain.
      const tyre = inkLines([...wireTyre(CAR.wheelR, 0.27), ...ring(0.06, 16)], 1.2, PAL.steel);
      tyre.position.set(ax, CAR.wheelR, (s * tr) / 2);
      root.add(tyre);
    }
  }

  // Main propshaft (revealed by scaling along x from the engine's rear face).
  const main = add('main', makePart(cylX(SHAFT.main.r, SHAFT.main.from - SHAFT.main.to), PAL.paper, {threshold: 40}));
  main.group.position.set(SHAFT.main.from, SHAFT.main.y, SHAFT.main.z);

  // Transaxle housing: clutch bell, main case, rear diff, half shafts.
  const tx = new THREE.Group();
  root.add(tx);
  const diff = new THREE.CylinderGeometry(0.14, 0.14, 0.52, 36);
  diff.rotateX(Math.PI / 2);
  diff.translate(CAR.axleR, 0.36, 0);
  add('case', makePart(housing(), PAL.paper, {threshold: 25}), tx);
  add('diff', makePart(diff, PAL.paper), tx);
  for (const s of [-1, 1]) {
    const hs = new THREE.CylinderGeometry(0.028, 0.028, CAR.trackR / 2 - 0.2, 16);
    hs.rotateX(Math.PI / 2);
    hs.translate(CAR.axleR, 0.357, s * (0.18 + (CAR.trackR / 2 - 0.2) / 2));
    add(`half${s}`, makePart(hs, PAL.paper, {threshold: 40}), tx);
  }

  // DCT internals: per pack, a disc stack (clutch) and a short gear cluster.
  const dct = new THREE.Group();
  root.add(dct);
  const packs = DCT.packs.map((pk) => {
    const discs: Part[] = [];
    for (let i = 0; i < DCT.discs; i++) {
      const g = new THREE.CylinderGeometry(DCT.discR, DCT.discR, 0.012, 32);
      g.rotateZ(Math.PI / 2);
      discs.push(add(`disc-${pk.name}-${i}`, makePart(g, PAL.paper, {shadow: false}), dct));
    }
    const gears: Part[] = pk.gears.map((n, i) => {
      const r = [0.075, 0.06, 0.048][i] + (pk.name === 'even' ? -0.006 : 0);
      const g = new THREE.CylinderGeometry(r, r, 0.035, 24);
      g.rotateZ(Math.PI / 2);
      const p = add(`gear-${n}`, makePart(g, PAL.paper, {shadow: false}), dct);
      p.group.position.set(DCT.x - 0.17 - i * 0.1, TRANSAXLE.y + 0.02, pk.z);
      return p;
    });
    const shaftG = cylX(0.014, 0.42, 12);
    const shaft = add(`shaft-${pk.name}`, makePart(shaftG, PAL.paper, {shadow: false}), dct);
    shaft.group.position.set(DCT.x + 0.02, TRANSAXLE.y + 0.02, pk.z);
    return {pk, discs, gears, shaft};
  });

  // Power pulses: bands that ride along the main shaft.
  const pulseMat = new THREE.MeshBasicMaterial({color: PAL.power});
  const pulses = Array.from({length: 7}, () => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(SHAFT.main.r * 1.3, SHAFT.main.r * 1.3, 0.05, 24).rotateZ(Math.PI / 2), pulseMat);
    root.add(m);
    return m;
  });
  // Floor chevrons under the shaft pointing rearward.
  const chev = new THREE.Shape();
  chev.moveTo(0, 0);
  chev.lineTo(0.14, 0.12);
  chev.lineTo(0.14, 0.05);
  chev.lineTo(0.06, -0.02);
  chev.lineTo(0.14, -0.09);
  chev.lineTo(0.14, -0.16);
  chev.closePath();
  const chevGeo = new THREE.ShapeGeometry(chev);
  chevGeo.rotateX(-Math.PI / 2);
  const chevrons = Array.from({length: 6}, () => {
    const m = new THREE.Mesh(chevGeo, new THREE.MeshBasicMaterial({color: PAL.power, transparent: true}));
    root.add(m);
    return m;
  });

  root.add(shadows);
  return {root, parts, tx, dct, packs, pulses, chevrons};
};

const Rig: React.FC<{f: number}> = ({f}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  applyPose(camera, poseAt(f));
  return null;
};

export const TransScene: React.FC<{f: number}> = ({f}) => {
  const {geo, ready} = useGeometry(ENGINE.file, prepEngine);
  const s = useMemo(buildStatic, []);
  const engine = useMemo(() => {
    if (!geo) return null;
    const p = makePart(geo, PAL.paper, {threshold: 38, width: 1.15});
    p.group.matrixAutoUpdate = false;
    p.group.matrix.copy(engineMatrix());
    s.root.add(p.group);
    if (p.shadow) s.root.add(p.shadow);
    return p;
  }, [geo, s]);

  // ---- per-frame state ---------------------------------------------------------
  const sweep = interpolate(f, T.sweep, [0, 1], clamp);
  const hitAge = f - T.hit;
  const cut = interpolate(f, T.cutaway, [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const flowOn = interpolate(f, [T.flow[0], T.flow[0] + 10], [0, 1], clamp);

  // Engine stays lit (it was the star of Beats 1–2); it throbs while sending power in Beat 4.
  // Engine: paper body, power-blue linework (it is 'live'); it breathes while sending power.
  if (engine) {
    setToon(engine.fill, 0.14 + (f >= T.beat4 ? 0.1 * (0.5 + 0.5 * Math.sin(f / 3)) * flowOn : 0));
    engine.lines.color.set(PAL.power);
  }

  // Propshaft draws itself as the camera travels, then carries power.
  const main = s.parts.main;
  main.group.scale.x = Math.max(0.001, sweep);
  setToon(main.fill, f >= T.beat4 ? 0.75 * flowOn : 0);

  // Transaxle: ghosted outline until the hit, then a hard light-up with a little overshoot,
  // then it opens up (housing fades) to show the dual clutch.
  const lit = hitAge >= 0;
  const pop = lit ? 1 + 0.07 * Math.exp(-hitAge / 4) * Math.cos(hitAge / 1.6) : 1;
  s.tx.scale.setScalar(pop);
  s.tx.position.set((1 - pop) * -1.3, (1 - pop) * 0.4, 0);
  // Before the hit it fades in as a wireframe ghost; in the cutaway it goes back to wire only.
  const ghost = interpolate(sweep, [0.55, 0.95], [0, 1], clamp);
  for (const name of ['case', 'diff', 'half-1', 'half1']) {
    const p = s.parts[name];
    // Full blue on the hit, then it settles so its form still reads.
    const flash = lit ? interpolate(hitAge, [0, 3, 14], [1, 1, 0.75], clamp) : 0;
    setToon(p.fill, flash, lit ? 1 - cut : 0);
    p.lines.opacity = lit ? 1 - 0.55 * cut : 0.6 * ghost;
    p.lines.color.set(lit && cut < 0.5 ? PAL.ink : PAL.steel);
  }

  // DCT internals.
  s.dct.visible = cut > 0.01;
  const gear = gearAt(f);
  const activeOdd = gear % 2 === 1;
  const since = sinceShift(f);
  s.packs.forEach(({pk, discs, gears, shaft}) => {
    const active = (pk.name === 'odd') === activeOdd && f >= T.shiftStart;
    // Engaged pack clamps its plates together; the idle one sits open with its gear pre-selected.
    const squeeze = active ? interpolate(since, [0, 5], [0.006, 0.0015], clamp) : 0.011;
    discs.forEach((d, i) => {
      d.group.position.set(DCT.x - i * (0.012 + squeeze), TRANSAXLE.y + 0.02, pk.z);
      setToon(d.fill, active ? 1 : 0.12, cut);
      d.lines.opacity = cut;
    });
    gears.forEach((g, i) => {
      const isGear = pk.gears[i] === gear;
      const next = pk.gears[i] === gear + 1;
      setToon(g.fill, isGear ? 1 : next ? 0.35 : 0, cut);
      g.lines.opacity = cut;
      g.group.rotation.x = active && isGear ? f * 0.5 : 0;
    });
    setToon(shaft.fill, active ? 0.8 : 0, cut);
    shaft.lines.opacity = cut;
  });

  // Pulses + chevrons: run from the engine back to the transaxle.
  const len = SHAFT.main.from - SHAFT.main.to;
  s.pulses.forEach((m, i) => {
    const u = ((f - T.flow[0]) * 0.022 + i / s.pulses.length) % 1;
    m.visible = f >= T.flow[0] && u >= 0;
    m.position.set(SHAFT.main.from - u * len, SHAFT.main.y, SHAFT.main.z);
    const edge = Math.min(1, u / 0.08, (1 - u) / 0.08);
    m.scale.set(1, 0.4 + 0.6 * edge, 0.4 + 0.6 * edge);
  });
  s.chevrons.forEach((m, i) => {
    const u = ((f - T.flow[0]) * 0.015 + i / s.chevrons.length) % 1;
    m.visible = f >= T.flow[0];
    m.position.set(SHAFT.main.from - 0.05 - u * (len - 0.2), 0.004, 0);
    // Floor arrows belong to the overview; they clear out for the cutaway.
    (m.material as THREE.MeshBasicMaterial).opacity = flowOn * (1 - cut) * Math.min(1, u / 0.15, (1 - u) / 0.15);
  });

  // Floor shadows follow their parts.
  s.root.updateMatrixWorld(true);
  const parts = engine ? [...Object.values(s.parts), engine] : Object.values(s.parts);
  parts.forEach((p) => {
    if (!p.shadow) return;
    const visible = p.fill.visible && p.fill.uniforms.opacity.value > 0.5;
    p.shadow.visible = visible;
    p.shadow.matrix.multiplyMatrices(SHADOW_MATRIX, p.group.matrixWorld);
  });

  return (
    <ThreeCanvas flat width={1920} height={1080} style={{position: 'absolute', inset: 0}} gl={{alpha: true, antialias: true}}>
      <Rig f={f} />
      <primitive object={s.root} />
      {engine ? <Settle onReady={ready} /> : null}
    </ThreeCanvas>
  );
};
