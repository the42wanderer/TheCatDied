import {Config} from '@remotion/cli/config';

// Transparent output: ProRes 4444 keeps the alpha channel for NLE use.
Config.setVideoImageFormat('png');
Config.setPixelFormat('yuva444p10le');
Config.setCodec('prores');
Config.setProResProfile('4444');
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? null);
