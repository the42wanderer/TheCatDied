import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Background, C, FactRow, FooterStrip, GAP, HeaderStrip, Lines, Pt, Plate, Target, TargetBox, TitleBlock, display, mono} from './brutal/kit';
import {Wipe, useCount} from './brutal/anim';
import {G450D} from './content';

export type SpecSheetProps = {
  background: string;
  live?: boolean;
  panel: Pt & {w: number};
  targets: Target[];
};

const Stat: React.FC<{n: string; unit: string; label: string; i: number}> = ({n, unit, label, i}) => {
  const shown = useCount(n, 10 + i * 3, 18);
  return (
    <Wipe delay={8 + i * 3} len={7} dir="down" style={{background: C.bone, padding: '10px 12px 10px', position: 'relative'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 4, color: C.ink}}>
        <span style={{fontFamily: display, fontWeight: 900, fontSize: 64, lineHeight: 0.9, letterSpacing: -1}}>{shown}</span>
        <span style={{fontFamily: mono, fontWeight: 700, fontSize: 15, color: C.blood}}>{unit}</span>
      </div>
      <div style={{fontFamily: mono, fontSize: 10.5, letterSpacing: 1, color: C.graphite, marginTop: 6}}>{label}</div>
    </Wipe>
  );
};

export const SpecSheet: React.FC<SpecSheetProps> = ({background, live, panel, targets}) => (
  <AbsoluteFill style={{background: live ? 'transparent' : C.ink}}>
    {live ? null : <Background src={background} />}
    <Lines>
      {targets.map((t, i) => (
        <TargetBox key={i} {...t} />
      ))}
    </Lines>

    <div style={{position: 'absolute', left: panel.x, top: panel.y, width: panel.w, boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}}>
      <HeaderStrip left="SPEC TERMINAL — MERCEDES-BENZ" right="W465" index="06" />
      <TitleBlock title="G 450 d" size={120} height={108} tag="MILD-HYBRID DIESEL" />

      {/* Stat tiles */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: GAP, marginTop: GAP}}>
        {G450D.stats.map(([n, unit, label], i) => (
          <Stat key={label} n={n} unit={unit} label={label} i={i} />
        ))}
      </div>

      <Plate width={panel.w} padding="12px 26px 8px">
        {G450D.facts.map(([k, v], i) => (
          <FactRow key={k} k={k} v={v} last={i === G450D.facts.length - 1} delay={22 + i * 3} />
        ))}
      </Plate>
      <FooterStrip label="POWERTRAIN · DRIVETRAIN" right="MANUFACTURER FIGURES" />
    </div>
  </AbsoluteFill>
);
