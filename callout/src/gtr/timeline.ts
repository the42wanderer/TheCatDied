import * as THREE from 'three';
import {Easing, interpolate} from 'remotion';

// Test segment = script Beats 3–4 (0:16–0:32 in the full piece), 30 fps.
export const T = {
  total: 480,
  sweep: [40, 150], // camera travels engine -> rear, propshaft draws itself
  hit: 150, // transaxle lights up (bass hit)
  title: 160, // REAR TRANSAXLE card
  beat4: 240,
  flow: [250, 340], // power pulses run engine -> transaxle
  cutaway: [300, 336], // housing opens, DCT internals appear
  dct: 336, // DCT card
  shiftStart: 346,
  shiftEvery: 22,
};

export const gearAt = (f: number) => (f < T.shiftStart ? 1 : Math.min(6, 1 + Math.floor((f - T.shiftStart) / T.shiftEvery)));
export const sinceShift = (f: number) => (f < T.shiftStart ? f - T.shiftStart : (f - T.shiftStart) % T.shiftEvery);

type Key = {f: number; pos: [number, number, number]; target: [number, number, number]; fov: number};

const KEYS: Key[] = [
  {f: 0, pos: [2.5, 1.25, 1.7], target: [0.95, 0.5, 0], fov: 34},
  {f: 40, pos: [1.15, 1.1, 2.05], target: [0.55, 0.4, 0], fov: 38},
  {f: 150, pos: [-0.95, 1.1, 2.05], target: [-1.3, 0.42, 0], fov: 38},
  {f: 240, pos: [-0.7, 1.25, 1.6], target: [-1.3, 0.42, 0], fov: 36},
  {f: 292, pos: [2.9, 3.3, 3.6], target: [-0.25, 0.25, 0], fov: 34},
  {f: 336, pos: [-1.05, 1.32, 1.18], target: [-1.25, 0.4, 0], fov: 32},
  {f: 480, pos: [-1.15, 1.28, 1.08], target: [-1.26, 0.4, 0], fov: 32},
];

const ease = Easing.bezier(0.65, 0, 0.35, 1);

export type Pose = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};

export const poseAt = (f: number): Pose => {
  let i = KEYS.length - 2;
  for (let k = 0; k < KEYS.length - 1; k++) {
    if (f < KEYS[k + 1].f) {
      i = k;
      break;
    }
  }
  const a = KEYS[i];
  const b = KEYS[i + 1];
  // The sweep is a steady dolly; everything else eases in and out.
  const linear = a.f === T.sweep[0];
  const k = interpolate(f, [a.f, b.f], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: linear ? Easing.bezier(0.3, 0, 0.7, 1) : ease,
  });
  const lerp = (u: number[], v: number[]) => new THREE.Vector3(...u.map((x, j) => x + (v[j] - x) * k));
  return {pos: lerp(a.pos, b.pos), target: lerp(a.target, b.target), fov: a.fov + (b.fov - a.fov) * k};
};

const cam = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.05, 200);
export const applyPose = (c: THREE.PerspectiveCamera, p: Pose) => {
  c.fov = p.fov;
  c.aspect = 1920 / 1080;
  c.near = 0.05;
  c.far = 200;
  c.position.copy(p.pos);
  c.up.set(0, 1, 0);
  c.lookAt(p.target);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
};

export const project = (f: number, p: THREE.Vector3) => {
  applyPose(cam, poseAt(f));
  const v = p.clone().project(cam);
  return {x: (v.x * 0.5 + 0.5) * 1920, y: (-v.y * 0.5 + 0.5) * 1080};
};
