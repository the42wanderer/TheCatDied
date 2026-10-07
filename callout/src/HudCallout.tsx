import React from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/jetbrains-mono/400.css';

const displayFont = "'Chakra Petch'";
const monoFont = "'JetBrains Mono'";

// Hold rendering until both faces are ready so the first frames don't fall back.
const fontHandle = delayRender('Loading fonts');
Promise.all([
  document.fonts.load(`600 33px ${displayFont}`),
  document.fonts.load(`400 15px ${monoFont}`),
]).then(() => continueRender(fontHandle));

type Point = {x: number; y: number};

export type CalloutProps = {
  // Where the leader line starts (the thing being described), in 1920x1080 px.
  anchor: Point;
  // Top-left corner of the text box and its width.
  box: Point & {width: number};
  header: string;
  lines: string[];
  accent: string;
};

export const defaultCalloutProps: CalloutProps = {
  anchor: {x: 1185, y: 598},
  box: {x: 1130, y: 70, width: 740},
  header: 'SYS://G-CLASS  ·  LIGHTING MODULE',
  lines: [
    'HEADLAMPS: MULTIBEAM LED MATRIX',
    'DRLs: CIRCULAR LED RING',
    'HIGH BEAMS: ADAPTIVE ASSIST PLUS',
    'SMART: ACTIVE CORNERING & BOOST',
    'REAR: FULL-LED CLUSTERS',
  ],
  accent: '#3ff5ff',
};

const GLYPHS = '01<>/\\|#%&*+=ABCDEFGHJKLMNPRSTUVXYZ';
const HEADER_H = 46;
const LINE_H = 54;
const PAD_Y = 22;
const CHAMFER = 26;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Text that resolves left-to-right out of random glyphs.
const decode = (text: string, progress: number, seed: string, frame: number) => {
  const revealed = Math.floor(progress * text.length);
  const noise = 4;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (i < revealed || text[i] === ' ') {
      out += text[i];
    } else if (i < revealed + noise) {
      const r = random(`${seed}-${i}-${Math.floor(frame / 2)}`);
      out += GLYPHS[Math.floor(r * GLYPHS.length)];
    }
  }
  return out;
};

// Chamfered panel outline: top-right and bottom-left corners cut.
const panelPath = (w: number, h: number) =>
  `M0 0 H${w - CHAMFER} L${w} ${CHAMFER} V${h} H${CHAMFER} L0 ${h - CHAMFER} Z`;

export const HudCallout: React.FC<CalloutProps> = ({anchor, box, header, lines, accent}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const w = box.width;
  const h = HEADER_H + PAD_Y * 2 + lines.length * LINE_H;
  const exitStart = durationInFrames - 24;

  // --- Timeline -----------------------------------------------------------
  const anchorIn = interpolate(frame, [0, 12], [0, 1], {...clamp, easing: easeOut});
  const leaderIn = interpolate(frame, [6, 24], [0, 1], {...clamp, easing: easeOut});
  const frameIn = interpolate(frame, [18, 40], [0, 1], {...clamp, easing: easeOut});
  const fillIn = interpolate(frame, [26, 44], [0, 1], clamp);
  const exit = interpolate(frame, [exitStart, durationInFrames - 4], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const visible = 1 - exit;

  // Leader line: anchor -> elbow -> box left edge.
  const joinY = box.y + h * 0.62;
  const elbow = {x: box.x - 34, y: joinY};
  const leaderPath = `M${anchor.x} ${anchor.y} L${elbow.x} ${elbow.y} L${box.x} ${joinY}`;

  // Holographic flicker while the panel materialises, then a faint idle shimmer.
  const flicker =
    frame < 44
      ? 0.55 + 0.45 * random(`flicker-${frame}`)
      : 0.94 + 0.06 * Math.sin(frame / 3.1);

  // Exit glitch: horizontal jitter and vertical collapse.
  const glitchX = exit > 0 ? (random(`gx-${frame}`) - 0.5) * 40 * exit : 0;
  const collapse = 1 - exit * 0.96;

  const scanY = ((frame * 4) % (h + 120)) - 60;
  const scanPct = Math.min(100, interpolate(frame, [30, 110], [0, 100], clamp)).toFixed(1);
  const ripple = (frame % 36) / 36;

  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <svg
        width={1920}
        height={1080}
        style={{position: 'absolute', inset: 0, opacity: visible}}
      >
        <defs>
          <linearGradient id="cone" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={accent} stopOpacity={0.32} />
            <stop offset="1" stopColor={accent} stopOpacity={0} />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Projection cone from the anchor up into the panel */}
        <polygon
          points={`${anchor.x},${anchor.y} ${box.x + w * 0.18},${box.y + h} ${box.x + w * 0.78},${box.y + h}`}
          fill="url(#cone)"
          opacity={fillIn * 0.8 * flicker}
        />

        {/* Leader line */}
        <path
          d={leaderPath}
          pathLength={1}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeDasharray={1}
          strokeDashoffset={1 - leaderIn + exit}
          filter="url(#glow)"
        />

        {/* Anchor target */}
        <g transform={`translate(${anchor.x} ${anchor.y}) scale(${anchorIn})`} filter="url(#glow)">
          <circle r={7} fill={accent} />
          <circle r={16} fill="none" stroke={accent} strokeWidth={2} opacity={0.9} />
          <circle
            r={16 + ripple * 26}
            fill="none"
            stroke={accent}
            strokeWidth={1.5}
            opacity={(1 - ripple) * 0.8}
          />
          <circle
            r={26}
            fill="none"
            stroke={accent}
            strokeWidth={1.5}
            strokeDasharray="10 8"
            transform={`rotate(${frame * 4})`}
            opacity={0.7}
          />
        </g>
      </svg>

      {/* Panel */}
      <div
        style={{
          position: 'absolute',
          left: box.x + glitchX,
          top: box.y,
          width: w,
          height: h,
          transform: `perspective(1600px) rotateY(-7deg) rotateX(3deg) scaleY(${collapse})`,
          transformOrigin: 'left center',
          opacity: flicker * visible,
        }}
      >
        <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <clipPath id="panel">
              <path d={panelPath(w, h)} />
            </clipPath>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0 H0 V24" fill="none" stroke={accent} strokeOpacity={0.08} />
            </pattern>
            <linearGradient id="fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#04161c" stopOpacity={0.86} />
              <stop offset="1" stopColor="#020a10" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={accent} stopOpacity={0} />
              <stop offset="0.5" stopColor={accent} stopOpacity={0.18} />
              <stop offset="1" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          <g clipPath="url(#panel)" opacity={fillIn}>
            <rect width={w} height={h} fill="url(#fill)" />
            <rect width={w} height={h} fill="url(#grid)" />
            <rect y={scanY} width={w} height={60} fill="url(#scan)" />
            <line
              x1={0}
              x2={w}
              y1={HEADER_H}
              y2={HEADER_H}
              stroke={accent}
              strokeOpacity={0.35}
            />
          </g>

          {/* Outline draws on */}
          <path
            d={panelPath(w, h)}
            pathLength={1}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeDasharray={1}
            strokeDashoffset={1 - frameIn}
            filter="url(#glow)"
          />

          {/* Corner brackets */}
          <g stroke={accent} strokeWidth={4} fill="none" opacity={frameIn}>
            <path d={`M-10 22 V-10 H22`} />
            <path d={`M${w + 10} ${h - 22} V${h + 10} H${w - 22}`} />
          </g>

          {/* Header accent bar */}
          <rect
            x={w * 0.35}
            y={-5}
            width={w * 0.3 * frameIn}
            height={5}
            fill={accent}
            filter="url(#glow)"
          />
        </svg>

        {/* Header micro text */}
        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 48,
            top: 0,
            height: HEADER_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: monoFont,
            fontSize: 15,
            letterSpacing: 2,
            color: accent,
            opacity: fillIn * 0.8,
          }}
        >
          <span>{decode(header, interpolate(frame, [28, 52], [0, 1], clamp), 'hdr', frame)}</span>
          <span>SCAN {scanPct}%</span>
        </div>

        {/* Spec lines */}
        <div style={{position: 'absolute', left: 36, top: HEADER_H + PAD_Y}}>
          {lines.map((line, i) => {
            const start = 38 + i * 9;
            const p = interpolate(frame, [start, start + 22], [0, 1], clamp);
            const slide = interpolate(frame, [start, start + 14], [18, 0], {
              ...clamp,
              easing: easeOut,
            });
            return (
              <div
                key={line}
                style={{
                  height: LINE_H,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  opacity: p > 0 ? 1 : 0,
                  transform: `translateX(${slide}px)`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: accent,
                    boxShadow: `0 0 10px ${accent}`,
                    transform: 'rotate(45deg)',
                  }}
                />
                <span
                  style={{
                    fontFamily: displayFont,
                    fontWeight: 600,
                    fontSize: 33,
                    letterSpacing: 1.5,
                    color: '#e9feff',
                    textShadow: `0 0 12px ${accent}aa, 0 0 2px ${accent}`,
                    whiteSpace: 'pre',
                  }}
                >
                  {decode(line, p, `l${i}`, frame)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
