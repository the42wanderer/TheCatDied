import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CardClock, EXIT} from '../brutal/anim';
import {C, FactRow, FooterStrip, HeaderStrip, Lines, Plate, TargetBox, TitleBlock, mono} from '../brutal/kit';
import {DIM} from '../wire/model';
import {OffroadScene} from './OffroadScene';
import {OFFROAD_FRAMES, SHOTS, frameState, projectWorld} from './sim';

const deg = (r: number) => `${r >= 0 ? '+' : '−'}${Math.abs((r * 180) / Math.PI).toFixed(1).padStart(4, '0')}°`;

// Facts shown on the closing card: standard G-Class off-road hardware.
const OFFROAD_FACTS: [string, string][] = [
  ['DRIVE', '4MATIC · PERMANENT AWD'],
  ['DIFF LOCKS', '3 × 100%'],
  ['TRANSFER CASE', 'LOW RANGE'],
];

export const Offroad: React.FC = () => {
  const f = useCurrentFrame();
  const {shot, pose, cam} = frameState(f);
  const mob = shot.style === 'mob';
  const idx = SHOTS.indexOf(shot) + 1;
  const ink = mob ? C.ink : C.bone;
  const t = f - shot.from;

  // Front-right wheel hub, including its articulation, for the target box in shot 2.
  const fr = pose.wheels[0];
  const hub = new THREE.Vector3(fr.local.x, fr.local.y + fr.offset, fr.local.z + 0.15).applyMatrix4(pose.body);
  const hubPx = projectWorld(cam, hub);
  const hubTop = projectWorld(cam, hub.clone().add(new THREE.Vector3(0, DIM.wheelR, 0)));
  const hubSize = Math.abs(hubTop.y - hubPx.y) * 2.6;

  return (
    <AbsoluteFill style={{background: mob ? C.bone : C.ink, overflow: 'hidden'}}>
      {mob ? null : <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #1a1414 0%, #0e0e0e 70%)'}} />}
      <OffroadScene f={f} />

      {/* Shot slate */}
      {shot.name !== 'TERRAIN' ? (
        <div style={{position: 'absolute', left: 40, top: 36, display: 'flex', alignItems: 'center', gap: 12, fontFamily: mono, fontSize: 14, letterSpacing: 2, color: ink}}>
          <span style={{background: C.blood, color: C.bone, padding: '4px 8px', fontWeight: 700}}>{String(idx).padStart(2, '0')} / 05</span>
          <span>{shot.name}</span>
        </div>
      ) : null}

      {/* Live attitude from the simulation */}
      <div style={{position: 'absolute', left: 40, bottom: 36, fontFamily: mono, fontSize: 14, letterSpacing: 2, lineHeight: 1.7, color: ink}}>
        <div>PITCH {deg(pose.pitch)} · ROLL {deg(pose.roll)}</div>
        <div style={{color: mob ? C.blood : C.steel}}>
          ARTICULATION {Math.round((Math.max(...pose.wheels.map((w) => w.offset)) - Math.min(...pose.wheels.map((w) => w.offset))) * 1000)} mm · SIM
        </div>
      </div>

      {shot.name === 'ARTICULATION' ? (
        <CardClock t={t} dur={shot.to - shot.from}>
          <Lines>
            <TargetBox c={hubPx} size={hubSize} label="FR · WHEEL TRAVEL" delay={4} color={C.bone} />
          </Lines>
        </CardClock>
      ) : null}

      {shot.name === 'TERRAIN' ? (
        <CardClock t={t - 6} dur={shot.to - shot.from + EXIT}>
          <div style={{position: 'absolute', left: 1200, top: 30, width: 672, boxShadow: '0 30px 60px rgba(0,0,0,0.35)'}}>
            <HeaderStrip left="OFF-ROAD — MB G 450 d" right="W465" index="05" />
            <TitleBlock title="OFF-ROAD" size={120} height={108} tag="TERRAIN MODE" />
            <Plate width={672} padding="14px 26px 10px">
              {OFFROAD_FACTS.map(([k, v], i) => (
                <FactRow key={k} k={k} v={v} last={i === OFFROAD_FACTS.length - 1} delay={18 + i * 4} />
              ))}
            </Plate>
            <FooterStrip label="ILLUSTRATIVE TERRAIN" right="W465 · G 450 d" />
          </div>
        </CardClock>
      ) : null}

      {/* One-frame impact flash on cuts into the ink shots */}
      {mob && t === 0 ? <AbsoluteFill style={{background: C.blood}} /> : null}
    </AbsoluteFill>
  );
};

export {OFFROAD_FRAMES};
