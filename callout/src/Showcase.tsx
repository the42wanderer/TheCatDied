import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {BrutalistFrame, defaultBrutalistProps} from './BrutalistFrame';
import {BrutalistDetail} from './BrutalistDetail';
import {SpecSheet} from './SpecSheet';
import {CardClock, EXIT} from './brutal/anim';
import type {Pt} from './brutal/kit';
import {DETAILS, SPEC} from './series';
import tracks from '../public/tracks.json';

export const SHOWCASE_FRAMES = 784;
const VIDEO = 'source.mp4';

type Shot = keyof typeof tracks;
type Mat = [number, number, number, number]; // a, b, tx, ty of a similarity transform

const matAt = (shot: Shot, f: number): Mat => {
  const t = tracks[shot];
  const i = Math.max(0, Math.min(t.frames.length - 1, f - t.start));
  return t.frames[i] as Mat;
};

// Map a point from design frame `d` to frame `f`: M(f) · M(d)^-1 (both relative to the shot key).
const mapper = (shot: Shot, d: number, f: number) => {
  const [a1, b1, x1, y1] = matAt(shot, f);
  const [a0, b0, x0, y0] = matAt(shot, d);
  const s0 = a0 * a0 + b0 * b0;
  const toKey = (p: Pt): Pt => {
    const dx = p.x - x0;
    const dy = p.y - y0;
    return {x: (a0 * dx + b0 * dy) / s0, y: (-b0 * dx + a0 * dy) / s0};
  };
  const p = (pt: Pt): Pt => {
    const k = toKey(pt);
    return {x: a1 * k.x - b1 * k.y + x1, y: b1 * k.x + a1 * k.y + y1};
  };
  return {p, s: Math.hypot(a1, b1) / Math.sqrt(s0)};
};

const detail = (step: number) => {
  const {id: _id, ...props} = DETAILS.find((d) => d.step === step)!;
  return <BrutalistDetail {...props} live />;
};

// Cards follow the shot order of the source edit. `design` is the frame each layout was drawn on.
const CARDS: {from: number; to: number; shot: Shot; design: number; hold?: boolean; el: React.ReactNode}[] = [
  {from: 6, to: 181, shot: 'showroom', design: 90, el: <BrutalistFrame {...defaultBrutalistProps} video={VIDEO} live />},
  {from: 184, to: 267, shot: 'road', design: 240, el: detail(3)},
  {from: 268, to: 352, shot: 'road', design: 315, el: detail(4)},
  {from: 356, to: 440, shot: 'closeup', design: 390, el: detail(1)},
  {from: 444, to: 608, shot: 'front', design: 510, el: detail(2)},
  {from: 612, to: 690, shot: 'side', design: 660, el: detail(5)},
  {from: 692, to: SHOWCASE_FRAMES, shot: 'side', design: 765, hold: true, el: <SpecSheet {...SPEC} live />},
];

export const Showcase: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <OffthreadVideo src={staticFile(VIDEO)} />
      {CARDS.filter((c) => frame >= c.from && frame < c.to).map((c) => (
        <CardClock
          key={c.from}
          t={frame - c.from}
          // The last card holds through the end of the video instead of wiping out.
          dur={c.hold ? c.to - c.from + EXIT : c.to - c.from}
          map={mapper(c.shot, c.design, frame)}
        >
          {c.el}
        </CardClock>
      ))}
    </AbsoluteFill>
  );
};
