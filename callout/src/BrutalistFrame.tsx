import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  Background,
  C,
  FooterStrip,
  HeaderStrip,
  Lines,
  LOUPE_CAPTION_H,
  Loupe,
  Plate,
  Pt,
  TargetBox,
  TitleBlock,
  mono,
} from './brutal/kit';
import {Type, Wipe, useMapper, useProgress} from './brutal/anim';
import {LIGHTING} from './content';

export type BrutalistProps = {
  background: string;
  video?: string; // live mode: no still background, loupe magnifies this video
  live?: boolean;
  lampL: Pt;
  lampR: Pt;
  badge: Pt;
};

export const defaultBrutalistProps: BrutalistProps = {
  background: 'frame_0300.jpg',
  lampL: {x: 1187, y: 597},
  lampR: {x: 1572, y: 598},
  badge: {x: 1357, y: 607},
};

// Overview frame: the full lighting spec list, anchored to the black G in the showroom shot.
export const BrutalistFrame: React.FC<BrutalistProps> = ({background, video, live, lampL: kL, lampR: kR, badge}) => {
  const map = useMapper();
  const lampL = map.p(kL);
  const lampR = map.p(kR);
  const lines = useProgress(10, 12);
  const P = {x: 1200, y: 30, w: 672};
  const L = {x: 1006, y: 30, size: 188, zoom: 2.0};

  return (
    <AbsoluteFill style={{background: live ? 'transparent' : C.ink}}>
      {live ? null : <Background src={background} />}

      <Loupe
        src={background}
        video={video}
        focus={kL}
        x={L.x}
        y={L.y}
        size={L.size}
        zoom={L.zoom}
        title="LH-01 / MULTIBEAM"
        note="LED matrix projector, iconic round style"
      />

      <Lines>
        <g opacity={lines}>
        <line x1={lampL.x - 45} y1={lampL.y - 45} x2={L.x} y2={L.y + L.size + LOUPE_CAPTION_H} stroke={C.bone} strokeWidth={1} />
        <line
          x1={lampL.x + 45}
          y1={lampL.y - 45}
          x2={L.x + L.size}
          y2={L.y + L.size + LOUPE_CAPTION_H}
          stroke={C.bone}
          strokeWidth={1}
        />
        <line x1={lampL.x + 45} y1={lampL.y - 62} x2={lampR.x - 40} y2={lampR.y - 62} stroke={C.bone} strokeWidth={1} strokeDasharray="4 6" />
        <text x={(lampL.x + lampR.x) / 2} y={lampL.y - 72} fill={C.bone} fontFamily={mono} fontSize={12} letterSpacing={2} textAnchor="middle">
          L/R SYNC · MATCHED PAIR
        </text>
        </g>
        <TargetBox c={kL} size={90} label="LH-01" delay={2} />
        <TargetBox c={kR} size={80} label="#E7E3DA · RH-02" delay={6} />
        <TargetBox c={badge} size={62} delay={9} />
      </Lines>

      <div style={{position: 'absolute', left: P.x, top: P.y, width: P.w, boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}}>
        <HeaderStrip left="SPEC TERMINAL — MB G 450 d" right="REF 0x7F0A0A" index="00" />
        <TitleBlock title="LIGHTING" size={120} height={108} tag="SYS.02 / 05" />
        <Plate width={P.w} padding="14px 26px 10px">
          {LIGHTING.map((s, i) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                padding: '6px 0',
                fontFamily: mono,
                color: C.ink,
                borderBottom: i < LIGHTING.length - 1 ? '1px solid rgba(14,14,14,0.18)' : 'none',
              }}
            >
              <Wipe delay={14 + i * 4} len={5} dir="down" style={{width: 34, color: C.blood, fontWeight: 700, fontSize: 16}}>
                {String(i + 1).padStart(2, '0')}
              </Wipe>
              <Type text={s.label} delay={15 + i * 4} cps={3} style={{width: 132, fontSize: 15, letterSpacing: 1, paddingTop: 1}} />
              <span style={{flex: 1}}>
                <Type text={s.value} delay={17 + i * 4} cps={3.5} style={{display: 'block', fontSize: 16, fontWeight: 700, letterSpacing: 0.3}} />
                {s.note ? <Type text={s.note} delay={22 + i * 4} cps={4} style={{display: 'block', fontSize: 13, color: C.graphite, marginTop: 1}} /> : null}
              </span>
            </div>
          ))}
        </Plate>
        <FooterStrip label="5 SYSTEMS · STATUS NOMINAL" right="W465 · G 450 d" />
      </div>
    </AbsoluteFill>
  );
};
