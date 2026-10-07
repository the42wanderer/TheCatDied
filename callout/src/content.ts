// All on-screen copy lives here so wording can be changed without touching layout code.

export type LightingSpec = {
  label: string; // short row label in the overview list
  title: string; // big word on the detail card
  value: string; // headline spec
  note?: string; // secondary line
  facts: [string, string][]; // extra rows on the detail card
};

export const LIGHTING: LightingSpec[] = [
  {
    label: 'HEADLAMPS',
    title: 'HEADLAMPS',
    value: 'MULTIBEAM LED MATRIX PROJECTORS',
    note: 'iconic round style',
    facts: [
      ['TYPE', 'LED MATRIX PROJECTOR'],
      ['FORM', 'ICONIC ROUND'],
      ['CONTROL', 'CAMERA-GUIDED BEAM'],
    ],
  },
  {
    label: 'DRLs',
    title: 'DRLs',
    value: 'INTEGRATED CIRCULAR LED LIGHT RING',
    note: 'the G-Class light signature',
    facts: [
      ['SOURCE', 'LED'],
      ['SHAPE', 'FULL CIRCULAR RING'],
      ['MOUNT', 'INTEGRATED IN HEADLAMP'],
    ],
  },
  {
    label: 'HIGH BEAMS',
    title: 'HIGH BEAM',
    value: 'ADAPTIVE HIGHBEAM ASSIST PLUS',
    note: 'active anti-glare shadowing',
    facts: [
      ['MODE', 'HIGH BEAM STAYS ON'],
      ['GLARE', 'MASKS ONCOMING TRAFFIC'],
    ],
  },
  {
    label: 'SMART',
    title: 'SMART',
    value: 'ACTIVE CORNERING · HIGHWAY RANGE BOOST',
    note: '+ weather glare reduction',
    facts: [
      ['ACTIVE CORNERING', 'LIGHTS INTO THE BEND'],
      ['HIGHWAY MODE', 'RANGE BOOST AT SPEED'],
      ['WEATHER', 'GLARE REDUCTION'],
    ],
  },
  {
    label: 'TAIL LIGHTS',
    title: 'TAIL LIGHTS',
    value: 'FULL-LED REAR CLUSTERS',
    note: '+ integrated LED fog lamp',
    facts: [
      ['CLUSTERS', 'FULL LED'],
      ['FOG LAMP', 'INTEGRATED LED'],
    ],
  },
];

// Mercedes-Benz G 450 d (W465) published figures.
export const G450D = {
  stats: [
    ['367', 'PS', 'OUTPUT · 270 kW'],
    ['750', 'Nm', 'PEAK TORQUE'],
    ['5.8', 's', '0–100 km/h'],
    ['210', 'km/h', 'TOP SPEED'],
  ] as [string, string, string][],
  facts: [
    ['ENGINE', '3.0 L INLINE-6 DIESEL'],
    ['TORQUE BAND', '1,350–2,800 rpm'],
    ['HYBRID', '48 V ISG · +15 kW BOOST'],
    ['GEARBOX', '9G-TRONIC AUTOMATIC'],
    ['DRIVE', '4MATIC · 3 DIFF LOCKS'],
  ] as [string, string][],
};
