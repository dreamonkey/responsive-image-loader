import { deepFreeze } from './helpers';
import { ResponsiveImageLoaderConfig } from './config';

export const DEFAULT_OPTIONS = deepFreeze<ResponsiveImageLoaderConfig>({
  paths: {
    outputDir: '/',
    aliases: {},
  },
  conversion: {
    converter: 'sharp',
    enabledFormats: {
      webp: true,
      jpg: true,
    },
  },
  resolutionSwitching: {
    resizer: 'sharp',
    minViewport: 200,
    maxViewport: 3840,
    maxBreakpointsCount: 5,
    minSizeDifference: 35,
    supportRetina: true,
  },
  artDirection: {
    transformer: null,
    aliases: {},
    defaultRatio: 'original',
    defaultSize: 1.0,
    defaultTransformations: {},
  },
});
