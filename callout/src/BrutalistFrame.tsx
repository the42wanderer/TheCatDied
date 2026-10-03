import React from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile} from 'remotion';
import '@fontsource/big-shoulders-display/900';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

const display = "'Big Shoulders Display'";
const mono = "'JetBrains Mono'";

const fontHandle = delayRender('Loading fonts');
Promise.all([
  document.fonts.load(`900 100px ${display}`),
  document.fonts.load(`400 16px ${mono}`),
  document.fonts.load(`700 16px ${mono}`),
]).then(() => continueRender(fontHandle));

type Pt = {x: number; y: number};

export type BrutalistProps = {
  background: string;
  palette: {
    blood: string; // primary accent
    bone: string; // plate / line colour
    ink: string; // near-black
    steel: string; // secondary text
  };
  // Feature positions in the 1920x1080 frame.
  lampL: Pt;
  lampR: Pt;
  badge: Pt;
  specs: [string, string][];
};

export const defaultBrutalistProps: BrutalistProps = {
  background: 'frame_0300.jpg',
  palette: {blood: '#7f0a0a', bone: '#e7e3da', ink: '#0e0e0e', steel: '#8b8f94'},
  lampL: {x: 1187, y: 597},
  lampR: {x: 1572, y: 598},
  badge: {x: 1357, y: 607},
  specs: [
    ['HEADLAMPS', 'MULTIBEAM LED MATRIX'],
    ['DRL', 'CIRCULAR LED RING'],
    ['HIGH BEAM', 'ADAPTIVE ASSIST PLUS'],
    ['SMART', 'ACTIVE CORNERING + BOOST'],
    ['REAR', 'FULL-LED CLUSTERS'],
  ],
};

// Flower-poster style marker: thin frame with square "handles" on its corners.
const TargetBox: React.FC<{c: Pt; size: number; color: string; label?: string; labelSide?: 'top' | 'bottom'}> = ({
  c,
  size,
  color,
  label,
  labelSide = 'bottom',
}) => {
  const x = c.x - size / 2;
  const y = c.y - size / 2;
  const h = 14;
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} />
      <rect x={x - h / 2} y={y - h / 2} width={h} height={h} fill="none" stroke={color} strokeWidth={1.5} />
      <rect x={x + size - h / 2} y={y + size - h / 2} width={h} height={h} fill="none" stroke={color} strokeWidth={1.5} />
      <rect x={x + size - 5} y={y + size / 2 - 5} width={10} height={10} fill={color} />
      <line x1={c.x - 6} x2={c.x + 6} y1={c.y} y2={c.y} stroke={color} strokeWidth={1} />
      <line x1={c.x} x2={c.x} y1={c.y - 6} y2={c.y + 6} stroke={color} strokeWidth={1} />
      {label ? (
        <text
          x={x}
          y={labelSide === 'bottom' ? y + size + 24 : y - 14}
          fill={color}
          fontFamily={mono}
          fontSize={13}
          letterSpacing={1.5}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

const Barcode: React.FC<{w: number; h: number; color: string; seed?: number}> = ({w, h, color, seed = 7}) => {
  const bars: React.ReactNode[] = [];
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = ((seed * (i + 3) * 31) % 4) + 1;
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={bw} height={h} fill={color} />);
    x += bw + 1;
    i++;
  }
  return (
    <svg width={w} height={h}>
      {bars}
    </svg>
  );
};

const Screw: React.FC<{x: number; y: number; color: string}> = ({x, y, color}) => (
  <div
    style={{position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: 5, background: color}}
  />
);

export const BrutalistFrame: React.FC<BrutalistProps> = ({background, palette, lampL, lampR, badge, specs}) => {
  const {blood, bone, ink, steel} = palette;

  // Main spec panel, parked on the wall above the black G.
  const P = {x: 1200, y: 46, w: 672};
  const notch = 22;

  // Magnifier tile, docked to the left of the panel.
  const capH = 104;
  const L = {x: 1006, y: 46, size: 188, zoom: 2.0};

  return (
    <AbsoluteFill style={{background: ink}}>
      <Img src={staticFile(background)} style={{width: 1920, height: 1080}} />

      {/* Magnified headlamp */}
      <div
        style={{
          position: 'absolute',
          left: L.x,
          top: L.y,
          width: L.size,
          height: L.size,
          overflow: 'hidden',
          outline: `1.5px solid ${bone}`,
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
        }}
      >
        <Img
          src={staticFile(background)}
          style={{
            position: 'absolute',
            width: 1920 * L.zoom,
            height: 1080 * L.zoom,
            left: L.size / 2 - lampL.x * L.zoom,
            top: L.size / 2 - lampL.y * L.zoom,
            filter: 'contrast(1.12) saturate(0.85)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            background: blood,
            color: bone,
            fontFamily: mono,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 2,
            padding: '6px 10px',
          }}
        >
          2.0×
        </div>
      </div>

      {/* Linework: thin bone lines like the flower poster */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <g style={{filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.7))'}}>
          {/* headlamp box -> loupe corners (projection lines) */}
          <line x1={lampL.x - 45} y1={lampL.y - 45} x2={L.x} y2={L.y + L.size + capH} stroke={bone} strokeWidth={1} />
          <line x1={lampL.x + 45} y1={lampL.y - 45} x2={L.x + L.size} y2={L.y + L.size + capH} stroke={bone} strokeWidth={1} />
          {/* lamp pair link through the grille */}
          <line
            x1={lampL.x + 45}
            y1={lampL.y - 62}
            x2={lampR.x - 40}
            y2={lampR.y - 62}
            stroke={bone}
            strokeWidth={1}
            strokeDasharray="4 6"
          />
          <text x={(lampL.x + lampR.x) / 2} y={lampL.y - 72} fill={bone} fontFamily={mono} fontSize={12} letterSpacing={2} textAnchor="middle">
            L/R SYNC · MATCHED PAIR
          </text>

          <TargetBox c={lampL} size={90} color={bone} label="LH-01" />
          <TargetBox c={lampR} size={80} color={bone} label="#E7E3DA · RH-02" />
          <TargetBox c={badge} size={62} color={bone} />
        </g>
        <circle cx={lampL.x} cy={lampL.y} r={5} fill={blood} />
      </svg>

      {/* Loupe caption plate */}
      <div
        style={{
          position: 'absolute',
          left: L.x,
          top: L.y + L.size + 6,
          width: L.size,
          height: capH - 6,
          boxSizing: 'border-box',
          background: bone,
          padding: '10px 12px',
          fontFamily: mono,
          fontSize: 12,
          lineHeight: 1.4,
          color: ink,
        }}
      >
        <div style={{fontWeight: 700, letterSpacing: 1.5}}>LH-01 / MULTIBEAM</div>
        <div style={{color: '#55595e', marginTop: 4}}>segments dim around oncoming traffic</div>
        <div style={{position: 'absolute', left: 12, bottom: 10}}>
          <Barcode w={80} h={10} color={ink} seed={3} />
        </div>
        <div style={{position: 'absolute', right: 12, bottom: 8, color: blood, fontWeight: 700}}>■ REC</div>
      </div>

      {/* Main panel */}
      <div style={{position: 'absolute', left: P.x, top: P.y, width: P.w, boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}}>
        {/* header strip */}
        <div style={{display: 'flex', height: 34, gap: 6}}>
          <div
            style={{
              flex: 1,
              background: ink,
              color: bone,
              fontFamily: mono,
              fontSize: 13,
              letterSpacing: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 14px',
            }}
          >
            <span>SPEC TERMINAL — MB G-CLASS</span>
            <span style={{color: steel}}>REF 0x7F0A0A</span>
          </div>
          <div
            style={{
              width: 74,
              background: blood,
              color: bone,
              fontFamily: display,
              fontWeight: 900,
              fontSize: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            01
          </div>
        </div>

        {/* red title block with notched top edge */}
        <div
          style={{
            marginTop: 6,
            height: 128,
            background: blood,
            position: 'relative',
            clipPath: `polygon(0 0, 18% 0, calc(18% + ${notch}px) ${notch}px, calc(46% - ${notch}px) ${notch}px, 46% 0, 100% 0, 100% calc(100% - ${notch}px), calc(100% - ${notch}px) 100%, 0 100%)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 22,
              bottom: -14,
              fontFamily: display,
              fontWeight: 900,
              fontSize: 136,
              lineHeight: 1,
              letterSpacing: -2,
              color: bone,
            }}
          >
            LIGHTING
          </div>
          <div style={{position: 'absolute', right: 30, top: 34, textAlign: 'right'}}>
            <Barcode w={120} h={30} color={ink} />
            <div style={{fontFamily: mono, fontSize: 12, color: ink, letterSpacing: 2, marginTop: 6, fontWeight: 700}}>
              SYS.02 / 05
            </div>
          </div>
        </div>

        {/* bone spec plate */}
        <div style={{marginTop: 6, background: bone, position: 'relative', padding: '16px 26px 14px'}}>
          <Screw x={12} y={12} color={ink} />
          <Screw x={P.w - 12} y={12} color={ink} />
          {specs.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                height: 36,
                fontFamily: mono,
                fontSize: 19,
                color: ink,
                borderBottom: i < specs.length - 1 ? `1px solid rgba(14,14,14,0.18)` : 'none',
              }}
            >
              <span style={{width: 36, color: blood, fontWeight: 700}}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{letterSpacing: 1}}>{k}</span>
              <span
                style={{
                  flex: 1,
                  margin: '0 12px',
                  borderBottom: `2px dotted rgba(14,14,14,0.35)`,
                  transform: 'translateY(-5px)',
                }}
              />
              <span style={{fontWeight: 700, letterSpacing: 0.5}}>{v}</span>
            </div>
          ))}
        </div>

        {/* footer strip */}
        <div
          style={{
            marginTop: 6,
            height: 30,
            background: ink,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '0 14px',
            fontFamily: mono,
            fontSize: 12,
            letterSpacing: 2,
            color: bone,
          }}
        >
          <Barcode w={90} h={14} color={bone} seed={5} />
          <span>×</span>
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 10, height: 10, background: blood, display: 'inline-block'}} />
            STATUS NOMINAL
          </span>
          <span style={{marginLeft: 'auto', color: steel}}>28 · 93 · W465</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
