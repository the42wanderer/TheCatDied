import * as THREE from 'three';
import {Easing, interpolate} from 'remotion';

type Pose = {pos: [number, number, number]; target: [number, number, number]; fov: number};

// P0 lines up with the frozen side shot; P1 is the rear three-quarter hero view.
// P0 comes from tools/solve_pose.py (the source shot is a very wide lens, close to the car).
export const P0: Pose = {pos: [1.184, 1.007, 1.807], target: [-0.523, 1.23, -1.803], fov: 91};
export const P1: Pose = {pos: [-6.6, 1.55, 3.75], target: [-0.15, 0.98, 1.0], fov: 33};

// Frames (relative to the 3D section) for the turn.
export const TURN = {start: 16, end: 64};
const turnEase = Easing.bezier(0.72, 0, 0.16, 1);

const cyl = (p: [number, number, number]) => ({az: Math.atan2(p[2], p[0]), r: Math.hypot(p[0], p[2]), y: p[1]});

export const poseAt = (t: number): Pose => {
  const k = interpolate(t, [TURN.start, TURN.end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: turnEase,
  });
  // Slow drift after landing keeps the hold shot alive.
  const drift = Math.max(0, t - TURN.end) * 0.0016;
  const a = cyl(P0.pos);
  const b = cyl(P1.pos);
  const az = a.az + (b.az - a.az) * k + drift;
  const r = a.r + (b.r - a.r) * k;
  const y = a.y + (b.y - a.y) * k;
  const lerp = (u: number[], v: number[]) => u.map((x, i) => x + (v[i] - x) * k) as [number, number, number];
  return {pos: [r * Math.cos(az), y, r * Math.sin(az)], target: lerp(P0.target, P1.target), fov: P0.fov + (P1.fov - P0.fov) * k};
};

const cam = new THREE.PerspectiveCamera(50, 1920 / 1080, 0.05, 100);

export const applyPose = (c: THREE.PerspectiveCamera, p: Pose) => {
  c.fov = p.fov;
  c.aspect = 1920 / 1080;
  c.position.set(...p.pos);
  c.lookAt(...p.target);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
};

// World point -> 1920x1080 screen pixels for the same pose the canvas uses.
export const project = (t: number, pt: [number, number, number]) => {
  applyPose(cam, poseAt(t));
  const v = new THREE.Vector3(...pt).project(cam);
  return {x: (v.x * 0.5 + 0.5) * 1920, y: (-v.y * 0.5 + 0.5) * 1080};
};
