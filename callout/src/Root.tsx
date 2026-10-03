import {Composition} from 'remotion';
import {HudCallout, defaultCalloutProps} from './HudCallout';
import {BrutalistFrame, defaultBrutalistProps} from './BrutalistFrame';

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
  <Composition
    id="BrutalistFrame"
    component={BrutalistFrame}
    durationInFrames={1}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={defaultBrutalistProps}
  />
  </>
);
