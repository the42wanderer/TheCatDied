import {Config} from '@remotion/cli/config';

// Set REMOTION_BROWSER to a local Chrome/Chromium headless shell if Remotion can't download its own.
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? null);
