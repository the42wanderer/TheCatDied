import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, display, mono} from '../brutal/kit';
import {INTRO_T, IntroScene} from './IntroScene';

export const INTRO_FRAMES = 108;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Radial burst at the flip, a nod to Mob Psycho's flat-colour impact frames.
const Burst: React.FC<{p: number}> = ({p}) => {
  if (p <= 0 || p >= 1) return null;
  const rays = 28;
  const cx = 1180;
  const cy = 560;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: rays}, (_, i) => {
        const a0 = (i / rays) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2) / rays / 2.2;
        const r = 2400;
        return (
          <polygon
            key={i}
            points={`${cx},${cy} ${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`}
            fill={i % 2 ? C.blood : C.ink}
            opacity={(1 - p) * 0.85}
          />
        );
      })}
    </svg>
  );
};

export const Intro: React.FC = () => {
  const t = useCurrentFrame();
  if (t >= INTRO_FRAMES) return null;
  const mob = t >= INTRO_T.flip;

  const horizon = interpolate(t, [0, 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const dist = interpolate(t, INTRO_T.blackIn, [28, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const burst = interpolate(t, [INTRO_T.flip, INTRO_T.flip + 9], [0, 1], clamp);
  const type = interpolate(t, [INTRO_T.flip + 2, INTRO_T.flip + 10], [-1400, 0], {...clamp, easing: Easing.out(Easing.exp)});

  return (
    <AbsoluteFill style={{background: mob ? C.bone : C.ink, overflow: 'hidden'}}>
      {mob ? (
        <>
          <Burst p={burst} />
          {/* Giant type in negative space, behind the cars */}
          <div
            style={{
              position: 'absolute',
              left: 380 + type,
              top: -150,
              fontFamily: display,
              fontWeight: 900,
              fontSize: 520,
              lineHeight: 1,
              letterSpacing: -12,
              color: C.ink,
              whiteSpace: 'nowrap',
            }}
          >
            G 450 d
          </div>
        </>
      ) : (
        <>
          <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 55%, #1c0707 0%, #0e0e0e 60%)'}} />
          <div
            style={{
              position: 'absolute',
              left: 960 - 960 * horizon,
              width: 1920 * horizon,
              top: 452,
              height: 2,
              background: C.blood,
              boxShadow: `0 0 24px 4px ${C.blood}`,
            }}
          />
        </>
      )}

      <IntroScene t={t} />

      {/* Telemetry, terminal style */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 36,
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: 2,
          lineHeight: 1.7,
          color: mob ? C.ink : C.bone,
        }}
      >
        <div>W465 // 2 UNITS INBOUND</div>
        <div style={{color: mob ? C.blood : C.steel}}>
          DIST {dist.toFixed(1).padStart(4, '0')} m · {mob ? 'PARKED' : 'APPROACH'}
        </div>
      </div>

      {/* Two-frame flash on the flip */}
      {t >= INTRO_T.flip && t < INTRO_T.flip + 2 ? <AbsoluteFill style={{background: t === INTRO_T.flip ? '#ffffff' : C.blood}} /> : null}
    </AbsoluteFill>
  );
};

// Ink wipe that closes over the stylised frame and opens on the footage.
// Runs on the absolute timeline so it can overlap the first frames of the edit.
export const InkWipe: React.FC = () => {
  const t = useCurrentFrame();
  const close = interpolate(t, [96, 104], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const open = interpolate(t, [INTRO_FRAMES, INTRO_FRAMES + 10], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (close <= 0 || open >= 1) return null;
  // A slanted ink slab sweeps in from the right, then exits to the left.
  const lead = 2400 - close * 2400 - open * 2400;
  const slant = 420;
  const x0 = lead;
  const x1 = lead + 2400;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <polygon points={`${x0 + slant},0 ${x1 + slant},0 ${x1},1080 ${x0},1080`} fill={C.ink} />
      <polygon points={`${x0 + slant - 60},0 ${x0 + slant},0 ${x0},1080 ${x0 - 60},1080`} fill={C.blood} />
    </svg>
  );
};
