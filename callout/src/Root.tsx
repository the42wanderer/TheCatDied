import {Composition} from 'remotion';
import {HudCallout, defaultCalloutProps} from './HudCallout';

export const Root: React.FC = () => (
  <Composition
    id="HudCallout"
    component={HudCallout}
    durationInFrames={180}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={defaultCalloutProps}
  />
);
