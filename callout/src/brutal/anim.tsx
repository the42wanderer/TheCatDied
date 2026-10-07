import React, {createContext, useContext} from 'react';
import {Easing, interpolate} from 'remotion';
import type {Pt} from './kit';

// Animation clock for one card. Absent (null) means "fully shown", which is
// how the design stills render, so every component works in both modes.
type Clock = {t: number; dur: number} | null;
const ClockCtx = createContext<Clock>(null);

// Maps design (key-frame) coordinates to the current video frame.
type Mapper = {p: (pt: Pt) => Pt; s: number};
const identity: Mapper = {p: (pt) => pt, s: 1};
const MapCtx = createContext<Mapper>(identity);

export const EXIT = 7;
const snap = Easing.bezier(0.2, 0.9, 0.1, 1);

export const CardClock: React.FC<{t: number; dur: number; map?: Mapper; children: React.ReactNode}> = ({
  t,
  dur,
  map,
  children,
}) => (
  <ClockCtx.Provider value={{t, dur}}>
    <MapCtx.Provider value={map ?? identity}>{children}</MapCtx.Provider>
  </ClockCtx.Provider>
);

export const useMapper = () => useContext(MapCtx);

// 0..1 entrance progress starting `delay` frames into the card, multiplied by the shared exit.
export const useProgress = (delay: number, len = 9) => {
  const clock = useContext(ClockCtx);
  if (!clock) return 1;
  const enter = interpolate(clock.t, [delay, delay + len], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: snap,
  });
  const exit = interpolate(clock.dur - clock.t, [0, EXIT], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  return Math.min(enter, exit);
};

// Raw frames since a delay, for typing effects (exit handled by the wrapping wipe).
export const useElapsed = (delay: number) => {
  const clock = useContext(ClockCtx);
  if (!clock) return Infinity;
  return clock.t - delay;
};

type Dir = 'right' | 'down' | 'left';
const inset = (p: number, dir: Dir) => {
  const hidden = `${((1 - p) * 100).toFixed(2)}%`;
  if (dir === 'right') return `inset(0 ${hidden} 0 0)`;
  if (dir === 'left') return `inset(0 0 0 ${hidden})`;
  return `inset(0 0 ${hidden} 0)`;
};

// Hard-edged reveal: a block snaps open from one side.
export const Wipe: React.FC<{delay: number; len?: number; dir?: Dir; style?: React.CSSProperties; children: React.ReactNode}> = ({
  delay,
  len,
  dir = 'right',
  style,
  children,
}) => {
  const p = useProgress(delay, len);
  if (p >= 1) return <div style={style}>{children}</div>;
  return <div style={{...style, clipPath: inset(p, dir), visibility: p <= 0 ? 'hidden' : 'visible'}}>{children}</div>;
};

// Terminal-style typing. Hidden characters keep their space so layout never jumps.
export const Type: React.FC<{text: string; delay: number; cps?: number; style?: React.CSSProperties}> = ({
  text,
  delay,
  cps = 2.4,
  style,
}) => {
  const e = useElapsed(delay);
  const n = Math.max(0, Math.min(text.length, Math.floor(e * cps)));
  if (n >= text.length) return <span style={style}>{text}</span>;
  return (
    <span style={style}>
      {text.slice(0, n)}
      <span style={{opacity: 0}}>{text.slice(n)}</span>
    </span>
  );
};

// Number that counts up to its final value, keeping the same decimals.
export const useCount = (value: string, delay: number, len = 16) => {
  const p = useProgress(delay, len);
  const e = useElapsed(delay);
  if (e === Infinity || p >= 1) return value;
  const target = parseFloat(value.replace(/,/g, ''));
  const decimals = (value.split('.')[1] ?? '').length;
  return (target * Math.min(1, Math.max(0, e / len))).toFixed(decimals);
};
