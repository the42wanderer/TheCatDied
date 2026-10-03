import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Background, C, FactRow, FooterStrip, GAP, HeaderStrip, Lines, Pt, Plate, Target, TargetBox, TitleBlock, display, mono} from './brutal/kit';
import {G450D} from './content';

export type SpecSheetProps = {
  background: string;
  panel: Pt & {w: number};
  targets: Target[];
};

export const SpecSheet: React.FC<SpecSheetProps> = ({background, panel, targets}) => (
  <AbsoluteFill style={{background: C.ink}}>
    <Background src={background} />
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
        {G450D.stats.map(([n, unit, label]) => (
          <div key={label} style={{background: C.bone, padding: '10px 12px 10px', position: 'relative'}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 4, color: C.ink}}>
              <span style={{fontFamily: display, fontWeight: 900, fontSize: 64, lineHeight: 0.9, letterSpacing: -1}}>{n}</span>
              <span style={{fontFamily: mono, fontWeight: 700, fontSize: 15, color: C.blood}}>{unit}</span>
            </div>
            <div style={{fontFamily: mono, fontSize: 10.5, letterSpacing: 1, color: C.graphite, marginTop: 6}}>{label}</div>
          </div>
        ))}
      </div>

      <Plate width={panel.w} padding="12px 26px 8px">
        {G450D.facts.map(([k, v], i) => (
          <FactRow key={k} k={k} v={v} last={i === G450D.facts.length - 1} />
        ))}
      </Plate>
      <FooterStrip label="POWERTRAIN · DRIVETRAIN" right="MANUFACTURER FIGURES" />
    </div>
  </AbsoluteFill>
);
