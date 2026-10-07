import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {random} from 'remotion';
import * as THREE from 'three';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {C} from '../brutal/kit';
import {buildModel, buildWheel, DIM} from '../wire/model';
import {applyCam, carPose, frameState, height, pathZ, Style} from './sim';

const body = buildModel({wheels: false});

// ---- terrain ---------------------------------------------------------------
const X0 = -34;
const X1 = 34;
const Z0 = -16;
const Z1 = 16;

const terrainMesh = (() => {
  const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, 272, 128);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
})();

const gridLines = (step: number) => {
  const out: number[] = [];
  const s = 0.25;
  for (let z = Z0; z <= Z1; z += step)
    for (let x = X0; x < X1; x += s) out.push(x, height(x, z) + 0.015, z, x + s, height(x + s, z) + 0.015, z);
  for (let x = X0; x <= X1; x += step)
    for (let z = Z0; z < Z1; z += s) out.push(x, height(x, z) + 0.015, z, x, height(x, z + s) + 0.015, z + s);
  return new LineSegmentsGeometry().setPositions(out);
};
const denseGrid = gridLines(0.75);
const sparseGrid = gridLines(1.5);

const pathLine = (() => {
  const out: number[] = [];
  for (let x = -18; x < 18; x += 0.2) {
    out.push(x, height(x, pathZ(x)) + 0.05, pathZ(x), x + 0.2, height(x + 0.2, pathZ(x + 0.2)) + 0.05, pathZ(x + 0.2));
  }
  return new LineSegmentsGeometry().setPositions(out);
})();

const lineMat = (width: number) => {
  const m = new LineMaterial({color: 0xffffff, linewidth: width, transparent: true});
  m.resolution.set(1920, 1080);
  return m;
};
const fill = () => new THREE.MeshBasicMaterial({color: C.ink, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1});

// ---- dust --------------------------------------------------------------------
const DUST_AGE = 26;
const DUST_PER = 5;
const DUST_N = DUST_AGE * DUST_PER * 2;

const dustMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {color: {value: new THREE.Color(C.bone)}, hard: {value: 0}},
  vertexShader: `
    attribute float size; attribute float alpha; varying float vA;
    void main() {
      vA = alpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * 900.0 / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 color; uniform float hard; varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float soft = smoothstep(1.0, 0.0, d);
      float a = mix(soft * soft, step(d, 0.85), hard) * vA;
      if (a < 0.01) discard;
      gl_FragColor = vec4(color, a);
    }`,
});

const dustGeometry = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DUST_N * 3), 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(new Float32Array(DUST_N), 1));
  g.setAttribute('alpha', new THREE.Float32BufferAttribute(new Float32Array(DUST_N), 1));
  return g;
})();

// Particles are a pure function of the frame: each was kicked up by a rear wheel some frames ago.
const updateDust = (f: number, hard: boolean) => {
  const pos = dustGeometry.getAttribute('position') as THREE.BufferAttribute;
  const size = dustGeometry.getAttribute('size') as THREE.BufferAttribute;
  const alpha = dustGeometry.getAttribute('alpha') as THREE.BufferAttribute;
  let i = 0;
  for (let k = 0; k < DUST_AGE; k++) {
    const tau = f - k;
    const pose = tau >= 0 ? carPose(tau) : null;
    for (const side of [-1, 1]) {
      for (let j = 0; j < DUST_PER; j++, i++) {
        if (!pose) {
          alpha.setX(i, 0);
          continue;
        }
        const r = (n: number) => random(`d${tau}-${side}-${j}-${n}`);
        const age = k / 30;
        const origin = new THREE.Vector3(DIM.axleR - 0.3, 0.05, side * DIM.track).applyMatrix4(pose.body);
        const v = new THREE.Vector3(-0.8 - r(1) * 1.8, 0.4 + r(2) * 1.5, side * (0.1 + r(3) * 1.6)).transformDirection(pose.heading).multiplyScalar(1.2 + r(4));
        const p = origin.add(v.multiplyScalar(age)).add(new THREE.Vector3(0, -0.6 * age * age, 0));
        pos.setXYZ(i, p.x, p.y, p.z);
        size.setX(i, (hard ? 0.35 : 0.6) + age * (hard ? 1.6 : 4.2) * (0.6 + r(5)));
        alpha.setX(i, Math.max(0, 1 - k / DUST_AGE) ** 1.5 * (hard ? 1 : 0.11));
      }
    }
  }
  pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
};

// ---- scene ------------------------------------------------------------------
const CameraRig: React.FC<{f: number; fog: boolean}> = ({f, fog}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    camera.near = 0.05;
    camera.far = 400;
    applyCam(camera, frameState(f).cam);
    scene.fog = fog ? new THREE.Fog(C.ink, 14, 48) : null;
  }, [camera, scene, f, fog]);
  return null;
};

export const OffroadScene: React.FC<{f: number}> = ({f}) => {
  const s = useMemo(() => {
    const terrainFill = fill();
    const terrain = new THREE.Mesh(terrainMesh, terrainFill);
    const denseMat = lineMat(1.3);
    const sparseMat = lineMat(1.6);
    const dense = new LineSegments2(denseGrid, denseMat);
    const sparse = new LineSegments2(sparseGrid, sparseMat);
    const pathMat = lineMat(4);
    const path = new LineSegments2(pathLine, pathMat);

    const carFill = fill();
    const carLines = lineMat(2.4);
    const car = new THREE.Group();
    car.matrixAutoUpdate = false;
    body.solids.forEach((g) => car.add(new THREE.Mesh(g, carFill)));
    const bodyLines = new LineSegments2(new LineSegmentsGeometry().setPositions(body.edges), carLines);
    bodyLines.renderOrder = 2;
    car.add(bodyLines);
    const tailMat = new THREE.MeshBasicMaterial({color: '#ff2a1a'});
    body.tail.forEach((t) => car.add(new THREE.Mesh(t.geometry, tailMat)));

    const wheels = [1, -1, 1, -1].map((side) => {
      const w = buildWheel(side);
      const g = new THREE.Group();
      g.matrixAutoUpdate = false;
      w.solids.forEach((geo) => g.add(new THREE.Mesh(geo, carFill)));
      const l = new LineSegments2(new LineSegmentsGeometry().setPositions(w.edges), carLines);
      l.renderOrder = 2;
      g.add(l);
      return g;
    });

    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.frustumCulled = false;
    dust.renderOrder = 4;

    const root = new THREE.Group();
    root.add(terrain, dense, sparse, path, car, ...wheels, dust);
    return {root, terrainFill, denseMat, sparseMat, dense, sparse, path, pathMat, carFill, carLines, car, wheels, tailMat};
  }, []);

  const {shot, simF, pose} = frameState(f);
  const style: Style = shot.style;

  // Car + articulated wheels.
  s.car.matrix.copy(pose.body);
  pose.wheels.forEach((w, i) => {
    s.wheels[i].matrix
      .copy(pose.body)
      .multiply(new THREE.Matrix4().makeTranslation(w.local.x, w.local.y + w.offset, w.local.z))
      .multiply(new THREE.Matrix4().makeRotationZ(w.spin));
  });
  updateDust(simF, style === 'mob');

  // Palette: Tron = light on void; Mob = ink masses on paper.
  if (style === 'tron') {
    s.terrainFill.color.set(C.ink);
    s.denseMat.color.set('#4a4d52');
    s.dense.visible = true;
    s.sparse.visible = false;
    s.carFill.color.set(C.ink);
    s.carLines.color.set('#f6f3ec');
    dustMaterial.uniforms.color.value.set('#c9c2b4');
    dustMaterial.uniforms.hard.value = 0;
    dustMaterial.blending = THREE.AdditiveBlending;
    s.path.visible = false;
  } else {
    s.terrainFill.color.set(C.bone);
    s.sparseMat.color.set(C.ink);
    s.sparseMat.opacity = 0.55;
    s.dense.visible = false;
    s.sparse.visible = true;
    s.carFill.color.set(C.ink);
    s.carLines.color.set(C.bone);
    dustMaterial.uniforms.color.value.set(C.ink);
    dustMaterial.uniforms.hard.value = 1;
    dustMaterial.blending = THREE.NormalBlending;
    s.path.visible = shot.name === 'LINE';
    s.pathMat.color.set(C.blood);
  }

  return (
    <ThreeCanvas flat width={1920} height={1080} style={{position: 'absolute', inset: 0}} gl={{alpha: true, antialias: true}}>
      <CameraRig f={f} fog={style === 'tron'} />
      <primitive object={s.root} />
    </ThreeCanvas>
  );
};
