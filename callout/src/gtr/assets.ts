import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';

// Loaded once per render process and shared by every frame.
const cache = new Map<string, Promise<THREE.BufferGeometry>>();

const load = (file: string, prepare: (g: THREE.BufferGeometry) => void) => {
  if (!cache.has(file)) {
    cache.set(
      file,
      new Promise((resolve, reject) => {
        new STLLoader().load(
          staticFile(file),
          (g) => {
            prepare(g);
            resolve(g);
          },
          undefined,
          reject,
        );
      }),
    );
  }
  return cache.get(file)!;
};

// Starts loading immediately; the returned `ready` callback must run inside the canvas
// (see <Settle>) so the frame is redrawn with the geometry before Remotion captures it.
export const useGeometry = (file: string, prepare: (g: THREE.BufferGeometry) => void) => {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  const [handle] = useState(() => delayRender(`load ${file}`, {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    load(file, prepare).then(setGeo);
  }, [file, prepare]);
  return {geo, ready: () => continueRender(handle)};
};
