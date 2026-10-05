import React from 'react';
import {Composition} from 'remotion';
import {HudCallout, defaultCalloutProps} from './HudCallout';
import {BrutalistFrame, defaultBrutalistProps} from './BrutalistFrame';
import {BrutalistDetail} from './BrutalistDetail';
import {SpecSheet} from './SpecSheet';
import {Showcase, SHOWCASE_FRAMES} from './Showcase';
import {DETAILS, SPEC} from './series';
import {Offroad, OFFROAD_FRAMES} from './offroad/Offroad';

const still = {durationInFrames: 1, fps: 30, width: 1920, height: 1080};

export const Root: React.FC = () => (
  <>
    <Composition
      id="HudCallout"
      component={HudCallout}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultCalloutProps}
    />
    <Composition id="Overview-00-Lighting" component={BrutalistFrame} {...still} defaultProps={defaultBrutalistProps} />
    {DETAILS.map(({id, ...props}) => (
      <Composition key={id} id={id} component={BrutalistDetail} {...still} defaultProps={props} />
    ))}
    <Composition id="Showcase" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="OffRoad" component={Offroad} durationInFrames={OFFROAD_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Spec-06-G450d" component={SpecSheet} {...still} defaultProps={SPEC} />
  </>
);
