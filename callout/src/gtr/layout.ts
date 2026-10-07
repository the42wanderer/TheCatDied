import * as THREE from 'three';

// Nissan GT-R (R35) drivetrain layout, in metres. Car frame: +x forward, +y up, +z right.
// Wheelbase 2,780 mm (published). Other positions are illustrative placements that follow the
// published layout: front-mid engine, main propshaft back to a rear transaxle (DCT + rear diff +
// transfer), second shaft forward to the front differential.
export const CAR = {
  wheelbase: 2.78,
  axleF: 1.39,
  axleR: -1.39,
  trackF: 1.59,
  trackR: 1.6,
  length: 4.71,
  width: 1.895,
  front: 2.38,
  rear: -2.33,
  wheelR: 0.355,
};

// Engine STL (1/24 kit, millimetres, +z up, flywheel end toward +y) -> car frame at full size.
export const ENGINE = {
  file: 'gtr/vr38.stl',
  scale: 0.024,
  centre: new THREE.Vector3(0.95, 0.49, 0),
  rearFace: 0.66, // flywheel end, where the main propshaft starts
};

export const engineMatrix = () => {
  // STL axes -> car axes: car x = -stl y, car y = stl z, car z = -stl x.
  const basis = new THREE.Matrix4().set(0, -1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  return new THREE.Matrix4()
    .makeTranslation(ENGINE.centre.x, ENGINE.centre.y, ENGINE.centre.z)
    .multiply(basis)
    .multiply(new THREE.Matrix4().makeScale(ENGINE.scale, ENGINE.scale, ENGINE.scale));
};

export const SHAFT = {
  main: {from: ENGINE.rearFace, to: -0.98, y: 0.38, z: 0, r: 0.045},
  front: {from: -0.98, to: 1.28, y: 0.27, z: 0.14, r: 0.035},
};

export const TRANSAXLE = {
  front: -0.98,
  back: -1.66,
  y: 0.4,
  width: 0.5,
  height: 0.44,
};

// Inside the transaxle: two clutch packs (odd / even gears) side by side for legibility.
export const DCT = {
  x: -1.1,
  packs: [
    {name: 'odd', gears: [1, 3, 5], z: -0.1},
    {name: 'even', gears: [2, 4, 6], z: 0.1},
  ],
  discs: 6,
  discR: 0.085,
};
