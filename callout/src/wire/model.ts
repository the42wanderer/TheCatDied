import * as THREE from 'three';

// Stylised G-Class (W465) built from primitives, in metres.
// Axes: +x forward, +y up, +z = the car's right-hand side.
// Overall length 4.825 m (incl. spare wheel), wheelbase 2.890 m, width 1.931 m.

export const DIM = {
  frontBumper: 2.415,
  front: 2.3,
  rear: -2.2,
  spareBack: -2.41,
  axleF: 1.4,
  axleR: -1.49,
  halfW: 0.91, // body side
  halfFlare: 0.965, // wheel-arch flares (1.931 m overall)
  sill: 0.46,
  belt: 1.3,
  roof: 1.97,
  wheelR: 0.39,
  track: 0.81,
};

type V3 = [number, number, number];

export type Model = {
  solids: THREE.BufferGeometry[]; // dark occluders (hidden-line removal)
  edges: number[]; // flat list of segment endpoints: x0,y0,z0,x1,y1,z1,...
  tail: {geometry: THREE.BufferGeometry; centre: V3}[]; // lit tail-light clusters
  anchors: Record<string, V3>; // points the overlay projects to screen
};

const seg = (out: number[], a: V3, b: V3) => out.push(...a, ...b);

const poly = (out: number[], pts: V3[], closed = true) => {
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) seg(out, pts[i], pts[(i + 1) % pts.length]);
};

// Circle in a plane given by centre, two in-plane unit axes and radius.
const circle = (out: number[], c: V3, u: V3, v: V3, r: number, n = 40) => {
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([c[0] + r * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), c[1] + r * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), c[2] + r * (Math.cos(a) * u[2] + Math.sin(a) * v[2])]);
  }
  poly(out, pts);
};

// Rectangle on a plane of constant x (rear/front faces) or constant z (sides).
const rectX = (out: number[], x: number, z0: number, z1: number, y0: number, y1: number) =>
  poly(out, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]]);
const rectZ = (out: number[], z: number, x0: number, x1: number, y0: number, y1: number) =>
  poly(out, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);

// Hexahedron from 8 corners: bottom 0-3, top 4-7, same winding.
const hexa = (c: V3[]) => {
  const g = new THREE.BufferGeometry();
  const f = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(c.flat(), 3));
  g.setIndex(f);
  g.computeVertexNormals();
  return g;
};

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  hexa([
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ]);

const edgesOf = (out: number[], g: THREE.BufferGeometry, threshold = 25) => {
  const e = new THREE.EdgesGeometry(g, threshold).getAttribute('position').array;
  for (let i = 0; i < e.length; i++) out.push(e[i]);
};

// One road wheel centred on its hub, axle along z; spokes face the `side` (+1 right, -1 left).
export const buildWheel = (side: number) => {
  const solids: THREE.BufferGeometry[] = [];
  const edges: number[] = [];
  const tyre = new THREE.CylinderGeometry(DIM.wheelR, DIM.wheelR, 0.28, 32);
  tyre.rotateX(Math.PI / 2);
  solids.push(tyre);
  edgesOf(edges, tyre, 40);
  const c: V3 = [0, 0, side * (0.14 + 0.006)];
  circle(edges, c, [1, 0, 0], [0, 1, 0], 0.27);
  circle(edges, c, [1, 0, 0], [0, 1, 0], 0.07, 16);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    seg(edges, [0.07 * Math.cos(a), 0.07 * Math.sin(a), c[2]], [0.27 * Math.cos(a), 0.27 * Math.sin(a), c[2]]);
  }
  return {solids, edges};
};

export const buildModel = (opts: {wheels: boolean} = {wheels: true}): Model => {
  const D = DIM;
  const solids: THREE.BufferGeometry[] = [];
  const edges: number[] = [];
  const add = (g: THREE.BufferGeometry, threshold?: number) => {
    solids.push(g);
    edgesOf(edges, g, threshold);
  };
  const eps = 0.006; // lift surface details off their face so they win the depth test

  // --- Body shell -----------------------------------------------------------
  add(box(D.rear, D.front, D.sill, D.belt, -D.halfW, D.halfW)); // lower body
  // Greenhouse: near-vertical windscreen, slight tumblehome to the roof.
  add(
    hexa([
      [-2.16, D.belt, -0.87], [1.0, D.belt, -0.87], [1.0, D.belt, 0.87], [-2.16, D.belt, 0.87],
      [-2.12, D.roof, -0.8], [0.8, D.roof, -0.8], [0.8, D.roof, 0.8], [-2.12, D.roof, 0.8],
    ]),
  );
  // Bonnet: slight rise from the grille to the windscreen.
  add(
    hexa([
      [1.0, D.belt, -0.76], [D.front - 0.02, D.belt - 0.06, -0.76], [D.front - 0.02, D.belt - 0.06, 0.76], [1.0, D.belt, 0.76],
      [1.0, D.belt + 0.04, -0.72], [D.front - 0.04, D.belt - 0.03, -0.72], [D.front - 0.04, D.belt - 0.03, 0.72], [1.0, D.belt + 0.04, 0.72],
    ]),
  );
  // Drip rails along the roof edges.
  for (const s of [-1, 1]) seg(edges, [-2.1, D.roof - 0.05, s * 0.83], [0.82, D.roof - 0.05, s * 0.83]);

  // --- Wheels, arches, flares ----------------------------------------------
  for (const ax of [D.axleF, D.axleR]) {
    for (const s of [-1, 1]) {
      if (opts.wheels) {
        const w = buildWheel(s);
        const at = new THREE.Matrix4().makeTranslation(ax, D.wheelR, s * D.track);
        w.solids.forEach((g) => solids.push(g.clone().applyMatrix4(at)));
        for (let i = 0; i < w.edges.length; i += 3) {
          const v = new THREE.Vector3(w.edges[i], w.edges[i + 1], w.edges[i + 2]).applyMatrix4(at);
          edges.push(v.x, v.y, v.z);
        }
      }
      // Arch flare: a squared-off arch standing proud of the body side.
      const r = 0.5;
      const z = s * D.halfFlare;
      const arch: V3[] = [];
      for (let k = 0; k <= 16; k++) {
        const a = Math.PI - (k / 16) * Math.PI;
        arch.push([ax + r * Math.cos(a), D.wheelR + 0.06 + r * 0.92 * Math.sin(a), z]);
      }
      poly(edges, [[ax - r - 0.08, D.sill, z], ...arch, [ax + r + 0.08, D.sill, z]], false);
      seg(edges, [ax - r - 0.08, D.sill, z], [ax - r - 0.08, D.sill, s * D.halfW]);
      seg(edges, [ax + r + 0.08, D.sill, z], [ax + r + 0.08, D.sill, s * D.halfW]);
    }
  }

  // --- Front ------------------------------------------------------------------
  add(box(D.front, D.frontBumper, 0.52, 0.78, -0.93, 0.93)); // bumper
  const fx = D.front + eps;
  rectX(edges, fx, -0.42, 0.42, 0.9, 1.2); // grille
  for (const y of [0.96, 1.02, 1.08, 1.14]) seg(edges, [fx, y, -0.4], [fx, y, 0.4]);
  circle(edges, [fx + 0.01, 1.05, 0], [0, 0, 1], [0, 1, 0], 0.1); // star badge ring
  for (const s of [-1, 1]) {
    const c: V3 = [fx + 0.02, 1.06, s * 0.66];
    circle(edges, c, [0, 0, 1], [0, 1, 0], 0.125); // headlamp bezel
    circle(edges, c, [0, 0, 1], [0, 1, 0], 0.095); // LED ring
    add(box(1.95, 2.12, D.belt, D.belt + 0.06, s * 0.82 - 0.05, s * 0.82 + 0.05)); // fender-top indicator
  }

  // --- Sides --------------------------------------------------------------
  for (const s of [-1, 1]) {
    const z = s * (D.halfW + eps);
    const zg = s * (0.87 + eps);
    // Door seams.
    for (const x of [0.98, -0.3]) seg(edges, [x, D.sill + 0.06, z], [x, D.belt, z]);
    seg(edges, [-1.06, 0.95, z], [-1.06, D.belt, z]);
    // Side windows (front door, rear door, rear quarter).
    rectZ(edges, zg, 0.86, -0.24, D.belt + 0.05, D.roof - 0.1);
    rectZ(edges, zg, -0.36, -1.0, D.belt + 0.05, D.roof - 0.1);
    rectZ(edges, zg, -1.12, -2.02, D.belt + 0.05, D.roof - 0.1);
    // Protective trim strip and belt strip.
    rectZ(edges, s * (D.halfW + 0.012), 2.05, -2.1, 1.0, 1.04);
    // Door handles.
    rectZ(edges, z, -0.08, -0.24, 1.18, 1.22);
    rectZ(edges, z, -0.9, -1.04, 1.18, 1.22);
    // Running board.
    add(box(-0.98, 0.9, D.sill - 0.05, D.sill - 0.01, s * D.halfW - (s > 0 ? 0 : 0.12), s * D.halfW + (s > 0 ? 0.12 : 0)));
    // Mirrors.
    add(box(0.75, 0.92, 1.36, 1.5, s > 0 ? 0.87 : -1.07, s > 0 ? 1.07 : -0.87));
  }
  // Fuel filler flap, right rear quarter.
  rectZ(edges, D.halfW + eps, -1.66, -1.84, 1.08, 1.24);

  // --- Rear -----------------------------------------------------------------
  const rx = D.rear - eps;
  add(box(D.rear - 0.07, D.rear, 0.5, 0.66, -0.94, 0.94)); // bumper
  // Side-hinged tailgate (hinges on the right) with its window.
  rectX(edges, rx, -0.78, 0.78, 0.66, 1.9);
  rectX(edges, rx, -0.62, 0.62, 1.44, 1.84);
  for (const y of [1.08, 1.66]) add(box(D.rear - 0.03, D.rear, y - 0.04, y + 0.04, 0.74, 0.86));
  rectX(edges, rx, -0.72, -0.62, 1.22, 1.3); // handle
  // Spare wheel with hard cover.
  const spare = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 40);
  spare.rotateZ(Math.PI / 2);
  spare.translate(D.spareBack + 0.1, 1.02, 0);
  add(spare, 40);
  circle(edges, [D.spareBack - eps, 1.02, 0], [0, 0, 1], [0, 1, 0], 0.31);
  circle(edges, [D.spareBack - eps, 1.02, 0], [0, 0, 1], [0, 1, 0], 0.08, 20);

  // Tail-light clusters on the rear corners, beside the tailgate.
  const tail: Model['tail'] = [];
  for (const s of [-1, 1]) {
    const z0 = s * 0.8;
    const z1 = s * 0.925;
    const g = box(D.rear - 0.025, D.rear, 0.72, 1.12, Math.min(z0, z1), Math.max(z0, z1));
    tail.push({geometry: g, centre: [D.rear - 0.03, 0.92, s * 0.8625]});
    edgesOf(edges, g, 25);
    for (const y of [0.82, 0.92, 1.02]) seg(edges, [D.rear - 0.03, y, z0], [D.rear - 0.03, y, z1]);
  }

  return {
    solids,
    edges,
    tail,
    anchors: {
      tailL: tail[0].centre,
      tailR: tail[1].centre,
      noseLow: [D.frontBumper, 0.02, D.halfFlare + 0.6],
      tailLow: [D.spareBack, 0.02, D.halfFlare + 0.6],
      axleF: [D.axleF, 0.05, D.halfFlare + 0.25],
      axleR: [D.axleR, 0.05, D.halfFlare + 0.25],
    },
  };
};
