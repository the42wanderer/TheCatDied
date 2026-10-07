import * as THREE from 'three';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

// "Vox, but brutalist": flat paper tones in three hard bands, ink outlines, one power accent.
export const PAL = {
  paper: '#e7e3da',
  paperDeep: '#d8d2c5',
  ink: '#0e0e0e',
  steel: '#8b8f94',
  power: '#2346ff', // power flow only
  blood: '#7f0a0a', // emphasis only
  shadow: '#cdc6b7',
};

// Flat-banded shading lit from a fixed screen direction, so every shot shades consistently.
export const toon = (base: string) =>
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    uniforms: {
      base: {value: new THREE.Color(base)},
      accent: {value: new THREE.Color(PAL.power)},
      tint: {value: 0},
      opacity: {value: 1},
    },
    vertexShader: `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 base; uniform vec3 accent; uniform float tint; uniform float opacity;
      varying vec3 vN;
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        float d = dot(n, normalize(vec3(-0.45, 0.8, 0.4)));
        float band = d > 0.45 ? 1.0 : (d > -0.1 ? 0.86 : 0.72);
        vec3 c = mix(base, accent, tint) * band;
        gl_FragColor = vec4(c, opacity);
      }`,
  });

export const setToon = (m: THREE.ShaderMaterial, tint: number, opacity = 1) => {
  m.uniforms.tint.value = tint;
  m.uniforms.opacity.value = opacity;
  m.depthWrite = opacity > 0.99;
  m.visible = opacity > 0.001;
};

export const inkLines = (positions: ArrayLike<number>, width = 1.6, color: string = PAL.ink) => {
  const mat = new LineMaterial({color: new THREE.Color(color).getHex(), linewidth: width, transparent: true});
  mat.resolution.set(1920, 1080);
  const l = new LineSegments2(new LineSegmentsGeometry().setPositions(Array.from(positions)), mat);
  l.renderOrder = 2;
  return l;
};

export const edgesOf = (g: THREE.BufferGeometry, threshold = 30) => new THREE.EdgesGeometry(g, threshold).getAttribute('position').array;

// Planar shadow onto the floor along a fixed light direction (Vox-style flat drop shadows).
export const SHADOW_MATRIX = (() => {
  const L = new THREE.Vector3(-0.35, -1, -0.55);
  return new THREE.Matrix4().set(1, -L.x / L.y, 0, 0, 0, 0, 0, 0.002, 0, -L.z / L.y, 1, 0, 0, 0, 0, 1);
})();

export const shadowMaterial = new THREE.MeshBasicMaterial({color: PAL.shadow, depthWrite: false});
