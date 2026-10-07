import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CardClock, Type, Wipe} from '../brutal/anim';
import {C, FactRow, FooterStrip, HeaderStrip, Plate, TitleBlock, display, mono} from '../brutal/kit';
import {CAR, DCT, SHAFT, TRANSAXLE} from './layout';
import {PAL} from './look';
import {T, gearAt, project, sinceShift} from './timeline';
import {TransScene} from './TransScene';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Small ink chip pinned to a 3D point.
const Chip: React.FC<{at: {x: number; y: number}; text: string; tone?: 'ink' | 'power' | 'blood'; p: number; dx?: number; dy?: number}> = ({
  at,
  text,
  tone = 'ink',
  p,
  dx = 0,
  dy = -46,
}) => {
  if (p <= 0) return null;
  const bg = tone === 'power' ? PAL.power : tone === 'blood' ? C.blood : C.ink;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <line x1={at.x} y1={at.y} x2={at.x + dx} y2={at.y + dy + (dy > 0 ? 0 : 14)} stroke={C.ink} strokeWidth={1.5} opacity={p} />
        <circle cx={at.x} cy={at.y} r={4} fill={C.ink} opacity={p} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: at.x + dx,
          top: at.y + dy,
          transform: dy > 0 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          background: bg,
          color: C.bone,
          fontFamily: mono,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 2,
          padding: '6px 10px',
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </>
  );
};

const Slate: React.FC<{beat: string; name: string}> = ({beat, name}) => (
  <div style={{position: 'absolute', left: 40, top: 36, display: 'flex', alignItems: 'center', gap: 12, fontFamily: mono, fontSize: 14, letterSpacing: 2, color: C.ink}}>
    <span style={{background: C.ink, color: C.bone, padding: '4px 8px', fontWeight: 700}}>SPEED · R35</span>
    <span style={{background: PAL.power, color: C.bone, padding: '4px 8px', fontWeight: 700}}>{beat}</span>
    <span>{name}</span>
  </div>
);

// Big gear tile: the number snaps on every shift.
const GearTile: React.FC<{f: number}> = ({f}) => {
  const p = interpolate(f, [T.shiftStart - 8, T.shiftStart], [0, 1], clamp);
  if (p <= 0) return null;
  const gear = gearAt(f);
  const since = sinceShift(f);
  const kick = since >= 0 && since < 4 ? 1 - since / 4 : 0;
  const odd = gear % 2 === 1;
  return (
    <div style={{position: 'absolute', left: 40, bottom: 40, display: 'flex', gap: 6, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}}>
      <div style={{background: C.ink, color: C.bone, width: 200, height: 210, position: 'relative'}}>
        <div style={{position: 'absolute', left: 16, top: 12, fontFamily: mono, fontSize: 14, letterSpacing: 3}}>GEAR</div>
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: -22,
            fontFamily: display,
            fontWeight: 900,
            fontSize: 220,
            lineHeight: 1,
            color: kick > 0 ? PAL.power : C.bone,
            transform: `translateY(${kick * -14}px)`,
          }}
        >
          {gear}
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        {[
          {label: 'ODD CLUTCH', gears: '1 · 3 · 5', on: odd},
          {label: 'EVEN CLUTCH', gears: '2 · 4 · 6', on: !odd},
        ].map((c) => (
          <div
            key={c.label}
            style={{
              width: 250,
              height: 102,
              boxSizing: 'border-box',
              padding: '12px 16px',
              background: c.on ? PAL.power : C.bone,
              color: c.on ? C.bone : C.ink,
              border: `2px solid ${C.ink}`,
              fontFamily: mono,
            }}
          >
            <div style={{fontSize: 13, letterSpacing: 2}}>{c.label}</div>
            <div style={{fontFamily: display, fontWeight: 900, fontSize: 44, lineHeight: 1.1}}>{c.gears}</div>
            <div style={{fontSize: 12, letterSpacing: 2, opacity: 0.85}}>{c.on ? 'ENGAGED' : gear < 6 ? 'NEXT GEAR PRE-SELECTED' : 'STANDBY'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Transmission: React.FC = () => {
  const f = useCurrentFrame();
  const hitAge = f - T.hit;

  const txPoint = project(f, new THREE.Vector3(TRANSAXLE.front - 0.3, TRANSAXLE.y + 0.24, 0));
  const shaftMid = project(f, new THREE.Vector3((SHAFT.main.from + SHAFT.main.to) / 2, SHAFT.main.y + 0.05, 0));
  const enginePt = project(f, new THREE.Vector3(0.95, 0.85, 0));
  const oddPt = project(f, new THREE.Vector3(DCT.x - 0.03, TRANSAXLE.y + 0.12, DCT.packs[0].z));
  const evenPt = project(f, new THREE.Vector3(DCT.x - 0.03, TRANSAXLE.y + 0.12, DCT.packs[1].z));

  const shake = hitAge >= 0 && hitAge < 10 ? Math.sin(hitAge * 2.7) * 10 * (1 - hitAge / 10) : 0;
  const beat4 = f >= T.beat4;

  return (
    <AbsoluteFill style={{background: PAL.paper, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.6}px)`}}>
        <TransScene f={f} />

        {/* Pinned labels */}
        <Chip at={enginePt} text="VR38DETT · FRONT" p={interpolate(f, [6, 16, T.sweep[0] + 30, T.sweep[0] + 40], [0, 1, 1, 0], clamp)} />
        <Chip at={shaftMid} text="POWER → REAR" tone="power" p={interpolate(f, [T.flow[0] + 6, T.flow[0] + 16, T.cutaway[0], T.cutaway[0] + 8], [0, 1, 1, 0], clamp)} />
        <Chip at={oddPt} text="1 · 3 · 5" tone={gearAt(f) % 2 ? 'power' : 'ink'} p={interpolate(f, [T.cutaway[1] - 4, T.cutaway[1] + 6], [0, 1], clamp)} dx={-60} dy={-70} />
        <Chip at={evenPt} text="2 · 4 · 6" tone={gearAt(f) % 2 ? 'ink' : 'power'} p={interpolate(f, [T.cutaway[1], T.cutaway[1] + 10], [0, 1], clamp)} dx={-60} dy={150} />
      </AbsoluteFill>

      {/* Beat 3 title: REAR TRANSAXLE */}
      {f >= T.title && f < T.beat4 + 30 ? (
        <CardClock t={f - T.title} dur={T.beat4 + 30 - T.title}>
          <div style={{position: 'absolute', right: 48, top: 40, width: 640, boxShadow: '14px 14px 0 rgba(14,14,14,0.9)'}}>
            <HeaderStrip left="R35 GT-R — DRIVETRAIN" right="BEAT 03" index="03" />
            <TitleBlock title="REAR TRANSAXLE" size={110} height={104} tag="AT THE REAR AXLE" />
            <Plate width={640} padding="14px 24px 10px">
              <FactRow k="GEARBOX" v="6-SPEED DUAL-CLUTCH" delay={16} />
              <FactRow k="ALSO INSIDE" v="REAR DIFF · TRANSFER CASE" delay={20} last />
            </Plate>
            <FooterStrip label="ENGINE FRONT · GEARBOX BACK" right="R35" />
          </div>
        </CardClock>
      ) : null}

      {/* Beat 4 title: 6-SPEED DCT */}
      {f >= T.dct ? (
        <CardClock t={f - T.dct} dur={T.total - T.dct + 10}>
          <div style={{position: 'absolute', right: 48, top: 40, width: 640, boxShadow: '14px 14px 0 rgba(14,14,14,0.9)'}}>
            <HeaderStrip left="R35 GT-R — DRIVETRAIN" right="BEAT 04" index="04" />
            <TitleBlock title="6-SPEED DCT" size={110} height={104} tag="1·3·5 / 2·4·6" />
            <Plate width={640} padding="14px 24px 10px">
              <FactRow k="CLUTCH A" v="ODD GEARS · 1 · 3 · 5" delay={16} />
              <FactRow k="CLUTCH B" v="EVEN GEARS · 2 · 4 · 6" delay={20} />
              <FactRow k="NEXT GEAR" v="ALREADY SELECTED" delay={24} last />
            </Plate>
            <FooterStrip label="ONE CLUTCH OPENS · THE OTHER CLOSES" right="DCT" />
          </div>
        </CardClock>
      ) : null}

      <GearTile f={f} />
      <Slate beat={beat4 ? '04 / 07' : '03 / 07'} name={beat4 ? 'POWER GOES BACK' : 'THE REVEAL'} />

      {/* Bass-hit impact: two hard frames */}
      {hitAge >= 0 && hitAge < 2 ? <AbsoluteFill style={{background: hitAge === 0 ? PAL.power : C.ink, mixBlendMode: hitAge === 0 ? 'multiply' : 'normal', opacity: hitAge === 0 ? 0.9 : 0.85}} /> : null}

      {/* Paper grain over everything */}
      <Img src={staticFile('gtr/grain.png')} style={{position: 'absolute', inset: 0, width: 1920, height: 1080, objectFit: 'cover', opacity: 0.09, mixBlendMode: 'multiply'}} />
    </AbsoluteFill>
  );
};

export const TRANSMISSION_FRAMES = T.total;
export {CAR};
