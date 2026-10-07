import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {Easing, interpolate, random} from 'remotion';
import * as THREE from 'three';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {C} from '../brutal/kit';
import {buildModel, DIM} from '../wire/model';
import pose from '../../public/showroom_pose.json';

const model = buildModel();
const lineGeo = new LineSegmentsGeometry().setPositions(model.edges);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Shot timing (frames from the start of the intro).
export const INTRO_T = {
  blackIn: [0, 62],
  whiteIn: [8, 70],
  flip: 74, // hard switch from Tron void to ink-and-paper
  shadowSweep: [76, 98],
};

const m4 = (a: number[]) => new THREE.Matrix4().fromArray(a);
const BLACK = m4(pose.black);
const WHITE = m4(pose.white);
// Stage = the black G's ground plane; the white G is placed relative to it.
const WHITE_IN_STAGE = BLACK.clone().invert().multiply(WHITE);

const lineMat = (color: string, width: number, opacity = 1, additive = false) => {
  const m = new LineMaterial({color: new THREE.Color(color).getHex(), linewidth: width, transparent: true, opacity});
  if (additive) {
    m.blending = THREE.AdditiveBlending;
    m.depthWrite = false;
  }
  m.resolution.set(1920, 1080);
  return m;
};

// Light trail: a ribbon on the ground from where the car started to its rear wheel, fading out behind.
const ribbon = (color: string) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(4 * 3), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(4 * 4), 4));
  g.setIndex([0, 1, 2, 1, 3, 2]);
  const c = new THREE.Color(color);
  const col = g.getAttribute('color') as THREE.BufferAttribute;
  // Far end transparent, near end bright.
  [0, 1].forEach((i) => col.setXYZW(i, c.r, c.g, c.b, 0));
  [2, 3].forEach((i) => col.setXYZW(i, c.r, c.g, c.b, 0.9));
  const mat = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide});
  return new THREE.Mesh(g, mat);
};

const setRibbon = (mesh: THREE.Mesh, x0: number, x1: number, z: number, w: number, opacity: number) => {
  const p = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  p.setXYZ(0, x0, 0.01, z - w);
  p.setXYZ(1, x0, 0.01, z + w);
  p.setXYZ(2, x1, 0.01, z - w);
  p.setXYZ(3, x1, 0.01, z + w);
  p.needsUpdate = true;
  (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
};

// Planar projection onto y=0 along light direction L (L.y < 0).
const shadowMatrix = (L: THREE.Vector3) =>
  new THREE.Matrix4().set(1, -L.x / L.y, 0, 0, 0, 0, 0, 0.004, 0, -L.z / L.y, 1, 0, 0, 0, 0, 1);

type Car = {
  root: THREE.Group; // stage placement * drive offset
  occluder: THREE.MeshBasicMaterial;
  core: LineMaterial;
  glow: LineMaterial;
  trails: THREE.Mesh[];
  shadow: THREE.Group;
  shadowMat: THREE.MeshBasicMaterial;
};

const makeCar = (shadowColor: string, trailColor: string): Car => {
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  const occluder = new THREE.MeshBasicMaterial({color: C.ink, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1});
  model.solids.forEach((g) => root.add(new THREE.Mesh(g, occluder)));
  const core = lineMat('#ffffff', 2.2);
  const glow = lineMat('#ffffff', 10, 0.2, true);
  const coreLines = new LineSegments2(lineGeo, core);
  const glowLines = new LineSegments2(lineGeo, glow);
  coreLines.renderOrder = 2;
  root.add(glowLines, coreLines);

  const shadowMat = new THREE.MeshBasicMaterial({color: shadowColor, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1});
  const shadow = new THREE.Group();
  shadow.matrixAutoUpdate = false;
  model.solids.forEach((g) => shadow.add(new THREE.Mesh(g, shadowMat)));
  return {root, occluder, core, glow, trails: [ribbon(trailColor), ribbon(trailColor)], shadow, shadowMat};
};

const CameraRig: React.FC<{fov: number}> = ({fov}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.fov = fov;
    camera.near = 0.1;
    camera.far = 250;
    camera.updateProjectionMatrix();
  }, [camera, fov]);
  return null;
};

// Drive-in offset along the car's own -x (it arrives nose-first), with a braking dip.
const drive = (t: number, [a, b]: number[], dist: number) => {
  const p = interpolate(t, [a, b], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const since = Math.max(0, t - b);
  const pitch = t > b ? -0.018 * Math.exp(-since / 5) * Math.cos(since / 2.2) : -0.01 * p * (1 - p) * 4;
  return {x: -dist * (1 - p), pitch, moving: p < 1};
};

export const IntroScene: React.FC<{t: number}> = ({t}) => {
  const scene = useMemo(() => {
    const stage = new THREE.Group();
    stage.matrixAutoUpdate = false;
    stage.matrix.copy(BLACK);
    const grid = new THREE.GridHelper(120, 120, new THREE.Color('#5a1010'), new THREE.Color('#2a0c0c'));
    const black = makeCar(C.blood, '#ff3322');
    const white = makeCar(C.ink, '#f6f3ec');
    stage.add(grid, black.root, white.root, black.shadow, white.shadow, ...black.trails, ...white.trails);
    return {stage, grid, black, white};
  }, []);

  const mob = t >= INTRO_T.flip;
  const {black, white, grid} = scene;

  // --- motion -------------------------------------------------------------
  const db = drive(t, INTRO_T.blackIn, 28);
  const dw = drive(t, INTRO_T.whiteIn, 24);
  const local = (d: ReturnType<typeof drive>) =>
    new THREE.Matrix4().makeTranslation(d.x, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(d.pitch));
  // Ink lines "boil" a little in the stylised phase, like hand-redrawn frames.
  const boil = (seed: string) =>
    mob ? new THREE.Matrix4().makeTranslation((random(`${seed}x${Math.floor(t / 2)}`) - 0.5) * 0.025, 0, (random(`${seed}z${Math.floor(t / 2)}`) - 0.5) * 0.025) : new THREE.Matrix4();
  const bLocal = local(db).premultiply(boil('b'));
  const wLocal = WHITE_IN_STAGE.clone().multiply(local(dw)).premultiply(boil('w'));
  black.root.matrix.copy(bLocal);
  white.root.matrix.copy(wLocal);

  // --- trails (Tron phase) ------------------------------------------------
  const trailFade = interpolate(t, [INTRO_T.whiteIn[1] - 4, INTRO_T.flip], [1, 0], clamp);
  [black, white].forEach((car, i) => {
    const d = i === 0 ? db : dw;
    const start = i === 0 ? -28 : -24;
    car.trails.forEach((tr, k) => {
      const z = (k === 0 ? -1 : 1) * DIM.track;
      setRibbon(tr, start + DIM.axleR, d.x + DIM.axleR, z, 0.11, mob ? 0 : trailFade);
      tr.matrixAutoUpdate = false;
      tr.matrix.copy(i === 0 ? new THREE.Matrix4() : WHITE_IN_STAGE);
    });
  });

  // --- palette per phase ---------------------------------------------------
  if (!mob) {
    black.core.color.set('#ff4433');
    black.glow.color.set(C.blood);
    white.core.color.set('#f6f3ec');
    white.glow.color.set(C.bone);
    black.occluder.color.set(C.ink);
    white.occluder.color.set(C.ink);
    black.glow.opacity = white.glow.opacity = 0.22;
    grid.visible = true;
    black.shadow.visible = white.shadow.visible = false;
  } else {
    // Negative space: the white G is paper defined only by ink lines; the black G is a solid ink mass.
    black.core.color.set(C.bone);
    white.core.color.set(C.ink);
    black.occluder.color.set(C.ink);
    white.occluder.color.set(C.bone);
    black.glow.opacity = white.glow.opacity = 0;
    grid.visible = false;
    const k = interpolate(t, INTRO_T.shadowSweep, [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
    const L = new THREE.Vector3(0.25 + 1.35 * k, -1, -0.15 - 0.6 * k);
    const S = shadowMatrix(L);
    black.shadow.visible = white.shadow.visible = true;
    black.shadow.matrix.copy(S.clone().multiply(bLocal));
    white.shadow.matrix.copy(S.clone().multiply(wLocal));
  }
  const gridFade = interpolate(t, [0, 14], [0, 1], clamp);
  (grid.material as THREE.LineBasicMaterial).transparent = true;
  (grid.material as THREE.LineBasicMaterial).opacity = gridFade;

  return (
    <ThreeCanvas flat width={1920} height={1080} style={{position: 'absolute', inset: 0}} gl={{alpha: true}}>
      <CameraRig fov={pose.fov} />
      {mob ? null : <fog attach="fog" args={[C.ink, 12, 60]} />}
      <primitive object={scene.stage} />
    </ThreeCanvas>
  );
};
