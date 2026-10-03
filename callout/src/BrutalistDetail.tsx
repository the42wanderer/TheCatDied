import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  Background,
  C,
  FactRow,
  FooterStrip,
  HeaderStrip,
  Lines,
  Pt,
  Plate,
  Target,
  TargetBox,
  TitleBlock,
  mono,
} from './brutal/kit';
import {LIGHTING} from './content';

export type DetailProps = {
  background: string;
  step: number; // 1-based index into LIGHTING
  panel: Pt & {w: number};
  targets: Target[];
  // Point on the panel edge the first target's leader runs to.
  leaderTo?: Pt;
  diagram?: 'beam';
  // Feature is outside the shot: draw an edge arrow instead of a box.
  offscreen?: {at: Pt; dir: 'left' | 'right'; label: string};
};

// Fan of beam segments with the ones around an oncoming car dimmed.
const BeamDiagram: React.FC = () => {
  const n = 15;
  const masked = new Set([9, 10, 11]);
  const w = 600;
  const h = 96;
  const origin = {x: 24, y: h / 2};
  return (
    <svg width={w} height={h} style={{display: 'block', marginTop: 10}}>
      {Array.from({length: n}, (_, i) => {
        const a0 = (-5.5 + (11 / n) * i) * (Math.PI / 180);
        const a1 = (-5.5 + (11 / n) * (i + 1)) * (Math.PI / 180);
        const r = 470;
        const p0 = {x: origin.x + r * Math.cos(a0), y: origin.y + r * Math.sin(a0)};
        const p1 = {x: origin.x + r * Math.cos(a1), y: origin.y + r * Math.sin(a1)};
        const off = masked.has(i);
        return (
          <polygon
            key={i}
            points={`${origin.x},${origin.y} ${p0.x},${p0.y} ${p1.x},${p1.y}`}
            fill={off ? 'transparent' : C.ink}
            fillOpacity={off ? 0 : 0.12 + (i % 2) * 0.06}
            stroke={off ? C.blood : C.ink}
            strokeOpacity={off ? 1 : 0.35}
            strokeDasharray={off ? '3 3' : undefined}
          />
        );
      })}
      <rect x={origin.x - 8} y={origin.y - 8} width={16} height={16} fill={C.ink} />
      {/* oncoming vehicle */}
      <rect x={430} y={origin.y + 7} width={30} height={17} fill={C.blood} />
      <text x={472} y={origin.y + 20} fontFamily={mono} fontSize={12} fill={C.blood} fontWeight={700}>
        ONCOMING · MASKED
      </text>
      <text x={w - 4} y={14} fontFamily={mono} fontSize={11} fill={C.graphite} textAnchor="end">
        BEAM SEGMENTS (ILLUSTRATIVE)
      </text>
    </svg>
  );
};

export const BrutalistDetail: React.FC<DetailProps> = ({background, step, panel, targets, leaderTo, diagram, offscreen}) => {
  const spec = LIGHTING[step - 1];
  const idx = String(step).padStart(2, '0');
  const first = targets[0];

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Background src={background} />

      <Lines>
        {first && leaderTo ? (
          <polyline
            points={`${first.c.x},${first.c.y - first.size / 2} ${first.c.x},${leaderTo.y} ${leaderTo.x},${leaderTo.y}`}
            fill="none"
            stroke={C.blood}
            strokeWidth={3}
          />
        ) : null}
        {targets.length > 1 ? (
          <line
            x1={targets[0].c.x + targets[0].size / 2}
            y1={targets[0].c.y}
            x2={targets[1].c.x - targets[1].size / 2}
            y2={targets[1].c.y}
            stroke={C.bone}
            strokeWidth={1}
            strokeDasharray="4 6"
          />
        ) : null}
        {targets.map((t, i) => (
          <TargetBox key={i} {...t} />
        ))}
        {offscreen ? (
          <g>
            <polygon
              points={
                offscreen.dir === 'left'
                  ? `${offscreen.at.x},${offscreen.at.y} ${offscreen.at.x + 34},${offscreen.at.y - 22} ${offscreen.at.x + 34},${offscreen.at.y + 22}`
                  : `${offscreen.at.x},${offscreen.at.y} ${offscreen.at.x - 34},${offscreen.at.y - 22} ${offscreen.at.x - 34},${offscreen.at.y + 22}`
              }
              fill={C.blood}
            />
            <text
              x={offscreen.dir === 'left' ? offscreen.at.x + 46 : offscreen.at.x - 46}
              y={offscreen.at.y + 5}
              fill={C.bone}
              fontFamily={mono}
              fontSize={14}
              letterSpacing={2}
              textAnchor={offscreen.dir === 'left' ? 'start' : 'end'}
            >
              {offscreen.label}
            </text>
          </g>
        ) : null}
      </Lines>

      <div style={{position: 'absolute', left: panel.x, top: panel.y, width: panel.w, boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}}>
        <HeaderStrip left={`LIGHTING / ${idx} — ${spec.label}`} right="G 450 d" index={idx} />
        <TitleBlock title={spec.title} size={120} height={108} tag={`SYS.02 / ${idx} OF 05`} />
        <Plate width={panel.w} padding="18px 26px 12px">
          <div style={{fontFamily: mono, fontWeight: 700, fontSize: 22, color: C.ink, letterSpacing: 0.3, lineHeight: 1.25}}>
            {spec.value}
          </div>
          {spec.note ? (
            <div style={{fontFamily: mono, fontSize: 15, color: C.blood, marginTop: 6, fontWeight: 700}}>{spec.note}</div>
          ) : null}
          {diagram === 'beam' ? <BeamDiagram /> : null}
          <div style={{marginTop: 12, borderTop: `2px solid ${C.ink}`}}>
            {spec.facts.map(([k, v], i) => (
              <FactRow key={k} k={k} v={v} last={i === spec.facts.length - 1} />
            ))}
          </div>
        </Plate>
        <FooterStrip step={step} label={`LIGHTING ${idx}/05`} right="W465 · G 450 d" />
      </div>
    </AbsoluteFill>
  );
};
