import React from 'react';
import {Img, OffthreadVideo, continueRender, delayRender, staticFile} from 'remotion';
import {Type, Wipe, useMapper, useProgress} from './anim';
// @ts-expect-error fontsource ships CSS-only entry points without type declarations
import '@fontsource/big-shoulders-display/900';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

export const display = "'Big Shoulders Display'";
export const mono = "'JetBrains Mono'";

const fontHandle = delayRender('Loading fonts');
Promise.all([
  document.fonts.load(`900 100px ${display}`),
  document.fonts.load(`400 16px ${mono}`),
  document.fonts.load(`700 16px ${mono}`),
]).then(() => continueRender(fontHandle));

export const C = {
  blood: '#7f0a0a',
  bone: '#e7e3da',
  ink: '#0e0e0e',
  steel: '#8b8f94',
  graphite: '#55595e',
};

export type Pt = {x: number; y: number};
export type Target = {c: Pt; size: number; label?: string; labelSide?: 'top' | 'bottom'; delay?: number};

export const GAP = 6;

// Flower-poster style marker: thin frame with square "handles" on its corners.
export const TargetBox: React.FC<Target & {color?: string}> = ({
  c: designC,
  size: designSize,
  label,
  labelSide = 'bottom',
  color = C.bone,
  delay = 4,
}) => {
  const map = useMapper();
  const c = map.p(designC);
  const size = designSize * map.s;
  const draw = useProgress(delay, 12);
  const pop = useProgress(delay + 8, 6);
  const chip = useProgress(delay + 10, 8);
  if (draw <= 0) return null;
  const x = c.x - size / 2;
  const y = c.y - size / 2;
  const h = Math.max(12, Math.min(18, size * 0.12));
  const handle = (hx: number, hy: number) => (
    <rect
      x={hx - (h / 2) * pop}
      y={hy - (h / 2) * pop}
      width={h * pop}
      height={h * pop}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
    />
  );
  const chipW = (label?.length ?? 0) * 9.4 + 16;
  const chipY = labelSide === 'bottom' ? y + size + 8 : y - 32;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      {pop > 0 ? (
        <>
          {handle(x, y)}
          {handle(x + size, y + size)}
          <rect x={x + size - 5 * pop} y={y + size / 2 - 5 * pop} width={10 * pop} height={10 * pop} fill={color} />
        </>
      ) : null}
      <line x1={c.x - 7 * draw} x2={c.x + 7 * draw} y1={c.y} y2={c.y} stroke={color} strokeWidth={1} />
      <line x1={c.x} x2={c.x} y1={c.y - 7 * draw} y2={c.y + 7 * draw} stroke={color} strokeWidth={1} />
      {label && chip > 0 ? (
        <g>
          <clipPath id={`chip-${designC.x}-${designC.y}`}>
            <rect x={x} y={chipY} width={chipW * chip} height={22} />
          </clipPath>
          <g clipPath={`url(#chip-${designC.x}-${designC.y})`}>
            <rect x={x} y={chipY} width={chipW} height={22} fill={C.ink} />
            <text
              x={x + 8}
              y={labelSide === 'bottom' ? y + size + 24 : y - 16}
              fill={color}
              fontFamily={mono}
              fontSize={13}
              letterSpacing={1.5}
            >
              {label}
            </text>
          </g>
        </g>
      ) : null}
    </g>
  );
};

export const Barcode: React.FC<{w: number; h: number; color: string; seed?: number}> = ({w, h, color, seed = 7}) => {
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
    <svg width={w} height={h} style={{display: 'block'}}>
      {bars}
    </svg>
  );
};

export const Screw: React.FC<{x: number; y: number}> = ({x, y}) => (
  <div style={{position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: 5, background: C.ink}} />
);

export const Background: React.FC<{src: string}> = ({src}) => (
  <Img src={staticFile(src)} style={{position: 'absolute', width: 1920, height: 1080}} />
);

// Thin linework layer across the whole frame, with a soft shadow for legibility.
export const Lines: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    <g style={{filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.75))'}}>{children}</g>
  </svg>
);

export const HeaderStrip: React.FC<{left: string; right: string; index: string}> = ({left, right, index}) => (
  <div style={{display: 'flex', height: 34, gap: GAP}}>
    <Wipe
      delay={0}
      style={{
        flex: 1,
        background: C.ink,
        color: C.bone,
        fontFamily: mono,
        fontSize: 13,
        letterSpacing: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
      }}
    >
      <Type text={left} delay={3} cps={4} />
      <Type text={right} delay={8} cps={3} style={{color: C.steel}} />
    </Wipe>
    <Wipe
      delay={2}
      dir="down"
      style={{
        width: 74,
        background: C.blood,
        color: C.bone,
        fontFamily: display,
        fontWeight: 900,
        fontSize: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {index}
    </Wipe>
  </div>
);

// Red block with a notch above the barcode tag (clear of the title) and chamfered bottom-right corner.
export const TitleBlock: React.FC<{title: string; size?: number; height?: number; tag: string}> = ({
  title,
  size = 136,
  height = 128,
  tag,
}) => {
  const n = 22;
  // Shrink long titles so they never run into the barcode tag (~0.47em per glyph).
  const fit = Math.min(size, 440 / (title.length * 0.47));
  const rise = useProgress(7, 10);
  return (
    <Wipe
      delay={3}
      dir="down"
      style={{
        marginTop: GAP,
        height,
        background: C.blood,
        position: 'relative',
        clipPath: `polygon(0 0, calc(100% - 196px) 0, calc(100% - 196px + ${n}px) ${n}px, calc(100% - 16px - ${n}px) ${n}px, calc(100% - 16px) 0, 100% 0, 100% calc(100% - ${n}px), calc(100% - ${n}px) 100%, 0 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 22,
          bottom: -fit * 0.1,
          fontFamily: display,
          fontWeight: 900,
          fontSize: fit,
          lineHeight: 1,
          letterSpacing: -2,
          color: C.bone,
          whiteSpace: 'nowrap',
          transform: `translateY(${((1 - rise) * 100).toFixed(1)}%)`,
        }}
      >
        {title}
      </div>
      <div style={{position: 'absolute', right: 30, top: 34, textAlign: 'right'}}>
        <Barcode w={120} h={30} color={C.ink} />
        <div style={{fontFamily: mono, fontSize: 12, color: C.ink, letterSpacing: 2, marginTop: 6, fontWeight: 700}}>
          <Type text={tag} delay={12} cps={3} />
        </div>
      </div>
    </Wipe>
  );
};

export const Plate: React.FC<{children: React.ReactNode; width: number; padding?: string}> = ({
  children,
  width,
  padding = '16px 26px 14px',
}) => (
  <Wipe delay={8} len={10} dir="down" style={{marginTop: GAP, background: C.bone, position: 'relative', padding}}>
    <Screw x={12} y={12} />
    <Screw x={width - 12} y={12} />
    {children}
  </Wipe>
);

// Footer with a 5-step progress rail so the viewer knows where they are in the series.
export const FooterStrip: React.FC<{step?: number; total?: number; label: string; right: string}> = ({
  step,
  total = 5,
  label,
  right,
}) => (
  <Wipe
    delay={12}
    style={{
      marginTop: GAP,
      height: 30,
      background: C.ink,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 14px',
      fontFamily: mono,
      fontSize: 12,
      letterSpacing: 2,
      color: C.bone,
    }}
  >
    {step === undefined ? (
      <Barcode w={90} h={14} color={C.bone} seed={5} />
    ) : (
      <span style={{display: 'flex', gap: 4}}>
        {Array.from({length: total}, (_, i) => (
          <span
            key={i}
            style={{
              width: 22,
              height: 10,
              background: i + 1 === step ? C.blood : 'transparent',
              border: `1px solid ${i + 1 === step ? C.blood : C.steel}`,
            }}
          />
        ))}
      </span>
    )}
    <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
      <span style={{width: 10, height: 10, background: C.blood, display: 'inline-block'}} />
      {label}
    </span>
    <span style={{marginLeft: 'auto', color: C.steel}}>{right}</span>
  </Wipe>
);

export const FactRow: React.FC<{k: string; v: string; last?: boolean; delay?: number}> = ({k, v, last, delay = 14}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      height: 32,
      fontFamily: mono,
      fontSize: 15,
      color: C.ink,
      borderBottom: last ? 'none' : '1px solid rgba(14,14,14,0.18)',
    }}
  >
    <Type text={k} delay={delay} cps={3} style={{letterSpacing: 1, color: C.graphite}} />
    <span style={{flex: 1, margin: '0 12px', borderBottom: '2px dotted rgba(14,14,14,0.3)', transform: 'translateY(-4px)'}} />
    <Type text={v} delay={delay + 3} cps={3} style={{fontWeight: 700, letterSpacing: 0.5}} />
  </div>
);

// Magnifier tile with a caption plate underneath.
export const Loupe: React.FC<{
  src: string;
  video?: string; // when set, the tile magnifies the live video instead of a still
  focus: Pt;
  x: number;
  y: number;
  size: number;
  zoom: number;
  title: string;
  note: string;
}> = ({src, video, focus: designFocus, x, y, size, zoom, title, note}) => {
  const map = useMapper();
  const focus = map.p(designFocus);
  const z = zoom * map.s;
  const media = {
    position: 'absolute' as const,
    width: 1920 * z,
    height: 1080 * z,
    left: size / 2 - focus.x * z,
    top: size / 2 - focus.y * z,
    filter: 'contrast(1.12) saturate(0.85)',
  };
  return (
  <>
    <Wipe
      delay={6}
      dir="down"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        overflow: 'hidden',
        outline: `1.5px solid ${C.bone}`,
        boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
      }}
    >
      {video ? <OffthreadVideo src={staticFile(video)} muted style={media} /> : <Img src={staticFile(src)} style={media} />}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          background: C.blood,
          color: C.bone,
          fontFamily: mono,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 2,
          padding: '6px 10px',
        }}
      >
        {zoom.toFixed(1)}×
      </div>
    </Wipe>
    <Wipe
      delay={10}
      dir="down"
      style={{
        position: 'absolute',
        left: x,
        top: y + size + GAP,
        width: size,
        height: LOUPE_CAPTION_H - GAP,
        boxSizing: 'border-box',
        background: C.bone,
        padding: '10px 12px',
        fontFamily: mono,
        fontSize: 12,
        lineHeight: 1.4,
        color: C.ink,
      }}
    >
      <div style={{fontWeight: 700, letterSpacing: 1.5}}>
        <Type text={title} delay={14} cps={3} />
      </div>
      <div style={{color: C.graphite, marginTop: 4}}>
        <Type text={note} delay={18} cps={4} />
      </div>
      <div style={{position: 'absolute', left: 12, bottom: 10}}>
        <Barcode w={80} h={10} color={C.ink} seed={3} />
      </div>
      <div style={{position: 'absolute', right: 12, bottom: 8, color: C.blood, fontWeight: 700}}>■ REC</div>
    </Wipe>
  </>
  );
};

export const LOUPE_CAPTION_H = 104;
