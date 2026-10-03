import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {BrutalistDetail} from '../BrutalistDetail';
import {CardClock, EXIT} from '../brutal/anim';
import {C, mono} from '../brutal/kit';
import {DETAILS} from '../series';
import {WireScene} from './WireScene';
import {project} from './camera';
import {buildModel} from './model';

const anchors = buildModel().anchors;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Section timing, in frames from the freeze.
export const WIRE = {
  scanEnd: 20, // photo -> line art sweep
  handoff: 20, // 3D clock starts here
  fadeEnd: 32, // line art fully replaced by the 3D wireframe
  glow: 76, // tail lights light up
  dims: 84, // dimension lines draw
  card: 92, // callout card builds
};

const Dimension: React.FC<{a: {x: number; y: number}; b: {x: number; y: number}; label: string; p: number}> = ({a, b, label, p}) => {
  if (p <= 0) return null;
  const end = {x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p};
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  // Keep labels upright whichever way the line runs.
  const textAng = Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang;
  const nx = -Math.sin(ang) * 10;
  const ny = Math.cos(ang) * 10;
  const mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
  return (
    <g stroke={C.steel} strokeWidth={1.5}>
      <line x1={a.x} y1={a.y} x2={end.x} y2={end.y} />
      <line x1={a.x - nx} y1={a.y - ny} x2={a.x + nx} y2={a.y + ny} />
      {p >= 1 ? <line x1={b.x - nx} y1={b.y - ny} x2={b.x + nx} y2={b.y + ny} /> : null}
      {p >= 1 ? (
        <g transform={`translate(${mid.x} ${mid.y}) rotate(${(textAng * 180) / Math.PI})`}>
          <rect x={-label.length * 4.6 - 8} y={-11} width={label.length * 9.2 + 16} height={22} fill={C.ink} stroke="none" />
          <text x={0} y={5} textAnchor="middle" fill={C.bone} stroke="none" fontFamily={mono} fontSize={13} letterSpacing={1.5}>
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
};

export const WireTail: React.FC<{start: number; end: number}> = ({start, end}) => {
  const t = useCurrentFrame() - start;
  if (t < 0) return null;
  const t3 = t - WIRE.handoff;

  const scan = interpolate(t, [0, WIRE.scanEnd], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const scanX = scan * 1920;
  const handoff = interpolate(t, [WIRE.handoff, WIRE.fadeEnd], [0, 1], clamp);
  // A few frames of flicker sell the swap from traced photo to model.
  const flicker = handoff > 0 && handoff < 1 ? 0.6 + 0.4 * random(`wf-${t}`) : 1;
  const glow = interpolate(t, [WIRE.glow, WIRE.glow + 12], [0, 1], clamp);
  const dims = interpolate(t, [WIRE.dims, WIRE.dims + 16], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

  const tl = project(t3, anchors.tailL);
  const tr = project(t3, anchors.tailR);
  const clusterPx = (pt: [number, number, number]) => {
    const top = project(t3, [pt[0], 1.12, pt[2]]);
    const bot = project(t3, [pt[0], 0.72, pt[2]]);
    return Math.max(64, Math.abs(bot.y - top.y) * 1.45);
  };

  const {id: _id, offscreen: _o, ...tailCard} = DETAILS.find((d) => d.step === 5)!;

  return (
    <AbsoluteFill style={{background: C.ink}}>
      {/* 1. Frozen photo, wiped away by the scan line */}
      {handoff < 1 ? (
        <>
          <Img src={staticFile('side_freeze.jpg')} style={{position: 'absolute', width: 1920, height: 1080, clipPath: `inset(0 0 0 ${scanX}px)`}} />
        </>
      ) : null}

      {/* 2. The 3D wireframe, under the fading line art so the swap reads as one drawing */}
      {t >= WIRE.handoff ? <WireScene t={t3} opacity={handoff * flicker} glow={glow * 0.9} /> : null}
      {handoff < 1 ? (
        <Img
          src={staticFile('side_edges.png')}
          style={{position: 'absolute', width: 1920, height: 1080, clipPath: `inset(0 ${1920 - scanX}px 0 0)`, opacity: (1 - handoff) * flicker}}
        />
      ) : null}

      {/* 3. Overlays: scan line, tail-light bloom, dimensions */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="bloom">
            <stop offset="0" stopColor="#ff2a1a" stopOpacity={0.55} />
            <stop offset="0.4" stopColor={C.blood} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.blood} stopOpacity={0} />
          </radialGradient>
        </defs>
        {scan > 0 && scan < 1 ? (
          <g>
            <rect x={scanX - 40} y={0} width={40} height={1080} fill={C.bone} opacity={0.08} />
            <line x1={scanX} x2={scanX} y1={0} y2={1080} stroke={C.bone} strokeWidth={3} />
            <rect x={scanX + 10} y={500} width={196} height={24} fill={C.blood} />
            <text x={scanX + 20} y={517} fill={C.bone} fontFamily={mono} fontSize={13} letterSpacing={2}>
              SCAN · {Math.round(scan * 100)}%
            </text>
          </g>
        ) : null}
        {glow > 0
          ? [tl, tr].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={90} fill="url(#bloom)" opacity={glow} style={{mixBlendMode: 'screen'}} />)
          : null}
        <Dimension a={project(t3, anchors.noseLow)} b={project(t3, anchors.tailLow)} label="4,825 mm" p={dims} />
        <Dimension a={project(t3, anchors.axleF)} b={project(t3, anchors.axleR)} label="WB 2,890 mm" p={interpolate(dims, [0.3, 1], [0, 1], clamp)} />
      </svg>

      {/* 4. Tail-light callout, targets locked to the projected clusters */}
      {t >= WIRE.card ? (
        <CardClock t={t - WIRE.card} dur={end - start - WIRE.card + EXIT}>
          <BrutalistDetail
            {...tailCard}
            live
            targets={[
              {c: tl, size: clusterPx(anchors.tailL), label: 'LH CLUSTER'},
              {c: tr, size: clusterPx(anchors.tailR), label: 'RH CLUSTER'},
            ]}
          />
        </CardClock>
      ) : null}
    </AbsoluteFill>
  );
};
