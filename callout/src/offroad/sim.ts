import * as THREE from 'three';
import {DIM} from '../wire/model';

// ---------------------------------------------------------------------------
// Terrain: layered value noise plus obstacles placed where each shot needs one.
// ---------------------------------------------------------------------------

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
const noise = (x: number, z: number) => {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const zf = smooth(z - zi);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
};

export const pathZ = (x: number) => 1.2 * Math.sin(x / 5);
const pathSlope = (x: number) => (1.2 / 5) * Math.cos(x / 5);

const bump = (x: number, z: number, cx: number, cz: number, sx: number, sz: number, h: number) =>
  h * Math.exp(-(((x - cx) / sx) ** 2) - ((z - cz) / sz) ** 2);

export const height = (x: number, z: number) => {
  const pz = pathZ(x);
  let h = 0.55 * noise(x * 0.18 + 3.1, z * 0.18 - 1.7) + 0.18 * noise(x * 0.7, z * 0.7) + 0.05 * noise(x * 2.3, z * 2.3);
  h += bump(x, z, -14.5, pz, 1.4, 3.5, 0.7); // crest for the head-on shot
  h += bump(x, z, -9.3, pz + 0.85, 0.55, 0.42, 0.62); // rock under the right-hand wheels
  h += bump(x, z, -3.8, pz, 1.0, 6, 0.9); // ridge for the side profile
  h += bump(x, z, 6.0, pz - 0.85, 0.6, 0.45, 0.38); // moguls: left, right, left
  h += bump(x, z, 8.2, pz + 0.85, 0.6, 0.45, 0.38);
  h += bump(x, z, 10.2, pz - 0.85, 0.6, 0.45, 0.38);
  // Hills rising away from the track frame the shots.
  h += 0.02 * Math.max(0, Math.abs(z - pz) - 6) ** 2;
  return h;
};

// ---------------------------------------------------------------------------
// Vehicle: drives the path at a crawl, body rests on the four contact patches.
// ---------------------------------------------------------------------------

export const SPEED = 0.17; // metres per frame (~18 km/h)
export const START_X = -18;

export type CarPose = {
  body: THREE.Matrix4; // model space -> world
  heading: THREE.Matrix4; // position + yaw only (stable camera frame)
  wheels: {local: THREE.Vector3; offset: number; spin: number; side: number}[];
  pitch: number;
  roll: number;
  pos: THREE.Vector3;
};

const WHEELS = [
  {ax: DIM.axleF, side: 1},
  {ax: DIM.axleF, side: -1},
  {ax: DIM.axleR, side: 1},
  {ax: DIM.axleR, side: -1},
];

export const carPose = (f: number): CarPose => {
  const x = START_X + f * SPEED;
  const z = pathZ(x);
  const yaw = -Math.atan(pathSlope(x));
  const heading = new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(yaw));

  // Ground under each wheel, found from the yawed (unpitched) footprint.
  const ground = WHEELS.map((w) => {
    const p = new THREE.Vector3(w.ax, 0, w.side * DIM.track).applyMatrix4(heading);
    return height(p.x, p.z);
  });
  const [fr, fl, rr, rl] = ground;
  const pitch = Math.atan2((fr + fl) / 2 - (rr + rl) / 2, DIM.axleF - DIM.axleR);
  const roll = -Math.atan2((fr + rr) / 2 - (fl + rl) / 2, 2 * DIM.track);
  const y = (fr + fl + rr + rl) / 4;

  const body = new THREE.Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeRotationZ(pitch))
    .multiply(new THREE.Matrix4().makeRotationX(roll));
  heading.setPosition(x, y, z);

  // Each wheel drops or lifts off the rigid body plane to keep contact: that's articulation.
  const dist = f * SPEED;
  const wheels = WHEELS.map((w, i) => {
    const local = new THREE.Vector3(w.ax, DIM.wheelR, w.side * DIM.track);
    const world = local.clone().applyMatrix4(body);
    const offset = THREE.MathUtils.clamp(ground[i] + DIM.wheelR - world.y, -0.28, 0.28);
    return {local, offset, spin: -dist / DIM.wheelR, side: w.side};
  });
  return {body, heading, wheels, pitch, roll, pos: new THREE.Vector3(x, y, z)};
};

// ---------------------------------------------------------------------------
// Shots
// ---------------------------------------------------------------------------

export type Style = 'tron' | 'mob';
export type Cam = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
export type Shot = {from: number; to: number; name: string; style: Style; freezeAt?: number; cam: (f: number, p: CarPose, t: number) => Cam};

const at = (m: THREE.Matrix4, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(m);
const shake = (f: number, amt: number) => new THREE.Vector3(Math.sin(f * 2.3) * amt, Math.sin(f * 3.7 + 1) * amt, Math.cos(f * 2.9) * amt);

export const SHOTS: Shot[] = [
  {
    from: 0, to: 36, name: 'APPROACH', style: 'tron',
    cam: (f, p, t) => {
      const pos = at(p.heading, 9.5 - t * 0.04, 0, -1.6);
      pos.y = height(pos.x, pos.z) + 0.55;
      return {pos: pos.add(shake(f, 0.015)), target: at(p.heading, 0, 1.0, 0), fov: 36};
    },
  },
  {
    from: 36, to: 66, name: 'ARTICULATION', style: 'mob',
    cam: (_f, p) => {
      const pos = at(p.heading, DIM.axleF + 1.2, 0, 5.2);
      pos.y = height(pos.x, pos.z) + 0.75;
      return {pos, target: at(p.heading, DIM.axleF - 0.6, 0.75, 0.4), fov: 34};
    },
  },
  {
    from: 66, to: 102, name: 'CREST', style: 'tron',
    cam: (_f, p) => {
      const pos = at(p.heading, 0.5, 0, 13);
      pos.y = height(pos.x, pos.z) + 1.0;
      return {pos, target: at(p.heading, 0, 1.0, 0), fov: 22};
    },
  },
  {
    from: 102, to: 132, name: 'LINE', style: 'mob',
    cam: (_f, p, t) => ({pos: at(p.heading, -1.5 - t * 0.05, 19, 0.6), target: at(p.heading, 2.5, 0, 0), fov: 42}),
  },
  {
    from: 132, to: 168, name: 'DUST', style: 'tron',
    cam: (f, p) => ({pos: at(p.heading, -8.5, 1.7, -1.4).add(shake(f, 0.04)), target: at(p.heading, 0, 1.1, 0), fov: 40}),
  },
  {
    from: 168, to: 216, name: 'TERRAIN', style: 'mob', freezeAt: 176,
    cam: (_f, p, t) => {
      const a = 0.65 + t * 0.004;
      // Car framed lower-left so the card can sit top-right.
      return {pos: at(p.heading, 7.4 * Math.cos(a), 1.5, 7.4 * Math.sin(a)), target: at(p.heading, 0.6, 1.55, -1.6), fov: 34};
    },
  },
];

export const OFFROAD_FRAMES = 216;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.from && f < s.to) ?? SHOTS[SHOTS.length - 1];

export const frameState = (f: number) => {
  const shot = shotAt(f);
  const simF = shot.freezeAt !== undefined ? Math.min(f, shot.freezeAt) : f;
  const pose = carPose(simF);
  const cam = shot.cam(f, pose, f - shot.from);
  return {shot, simF, pose, cam};
};

const projCam = new THREE.PerspectiveCamera(40, 1920 / 1080, 0.05, 400);
export const applyCam = (c: THREE.PerspectiveCamera, cam: Cam) => {
  c.fov = cam.fov;
  c.aspect = 1920 / 1080;
  c.position.copy(cam.pos);
  c.lookAt(cam.target);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
};
export const projectWorld = (cam: Cam, p: THREE.Vector3) => {
  applyCam(projCam, cam);
  const v = p.clone().project(projCam);
  return {x: (v.x * 0.5 + 0.5) * 1920, y: (-v.y * 0.5 + 0.5) * 1080, behind: v.z > 1};
};
