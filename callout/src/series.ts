// Per-frame layout for the lighting series, shared by the stills and the video.
import {DetailProps} from './BrutalistDetail';
import {SpecSheetProps} from './SpecSheet';

// One entry per lighting feature; backgrounds are stills pulled from the source video.
export const DETAILS: (DetailProps & {id: string})[] = [
  {
    id: 'Detail-01-Headlamps',
    background: 'frame_13.jpg',
    step: 1,
    panel: {x: 1200, y: 40, w: 672},
    targets: [{c: {x: 900, y: 270}, size: 540, label: 'LH-01 · MULTIBEAM LED'}],
  },
  {
    id: 'Detail-02-DRLs',
    background: 'frame_17.jpg',
    step: 2,
    panel: {x: 624, y: 30, w: 672},
    targets: [
      {c: {x: 330, y: 730}, size: 200, label: 'LH RING'},
      {c: {x: 1496, y: 730}, size: 200, label: 'RH RING'},
    ],
  },
  {
    id: 'Detail-03-HighBeam',
    background: 'frame_8.jpg',
    step: 3,
    diagram: 'beam',
    panel: {x: 1200, y: 30, w: 672},
    targets: [
      {c: {x: 874, y: 600}, size: 64, label: 'LH'},
      {c: {x: 1250, y: 600}, size: 64, label: 'RH'},
    ],
  },
  {
    id: 'Detail-04-Smart',
    background: 'frame_10.5.jpg',
    step: 4,
    panel: {x: 48, y: 30, w: 672},
    targets: [
      {c: {x: 954, y: 604}, size: 86, label: 'LH'},
      {c: {x: 1400, y: 604}, size: 86, label: 'RH'},
    ],
  },
  {
    id: 'Detail-05-TailLights',
    background: 'frame_22.jpg',
    step: 5,
    panel: {x: 1200, y: 30, w: 672},
    targets: [],
    offscreen: {at: {x: 40, y: 640}, dir: 'left', label: 'REAR CLUSTERS'},
  },
];

export const SPEC: SpecSheetProps = {
  background: 'frame_25.5.jpg',
  panel: {x: 1200, y: 30, w: 672},
  targets: [{c: {x: 1400, y: 960}, size: 300, label: '4MATIC · PERMANENT AWD', labelSide: 'top'}],
};

