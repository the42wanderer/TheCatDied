import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {C} from '../brutal/kit';
import {buildModel} from './model';
import {applyPose, poseAt} from './camera';

const model = buildModel();

const CameraRig: React.FC<{t: number}> = ({t}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => applyPose(camera, poseAt(t)), [camera, t]);
  return null;
};

const fatLines = (width: number, opacity: number, depthTest: boolean) => {
  const g = new LineSegmentsGeometry().setPositions(model.edges);
  const m = new LineMaterial({
    color: new THREE.Color(C.bone).getHex(),
    linewidth: width,
    transparent: opacity < 1,
    opacity,
    depthTest,
  });
  m.resolution.set(1920, 1080);
  const l = new LineSegments2(g, m);
  l.renderOrder = depthTest ? 2 : 1;
  return l;
};

export const WireScene: React.FC<{t: number; opacity: number; glow: number}> = ({t, opacity, glow}) => {
  const visible = useMemo(() => fatLines(2.2, 1, true), []);
  const xray = useMemo(() => fatLines(1.2, 0.14, false), []);
  const occluder = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: C.ink,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    [],
  );
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(16, 32, new THREE.Color('#3a3c3f'), new THREE.Color('#222426'));
    g.position.y = 0.001;
    return g;
  }, []);

  (visible.material as LineMaterial).opacity = opacity;
  (visible.material as LineMaterial).transparent = opacity < 1;
  (xray.material as LineMaterial).opacity = 0.14 * opacity;

  return (
    <ThreeCanvas flat width={1920} height={1080} style={{position: 'absolute', inset: 0}} camera={{fov: 50, near: 0.05, far: 100}}>
      <CameraRig t={t} />
      <primitive object={grid} />
      {model.solids.map((g, i) => (
        <mesh key={i} geometry={g} material={occluder} />
      ))}
      {model.tail.map((tl, i) => (
        <mesh key={`t${i}`} geometry={tl.geometry} renderOrder={3}>
          <meshBasicMaterial color={C.blood} transparent opacity={glow} />
        </mesh>
      ))}
      <primitive object={xray} />
      <primitive object={visible} />
    </ThreeCanvas>
  );
};
