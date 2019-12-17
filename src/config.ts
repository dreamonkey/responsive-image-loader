import { ConversionConfig } from './conversion';
import { deepFreeze } from './helpers';
import { PathsConfig } from './models';
import { ResizingConfig } from './resizing';
import { TransformationConfig } from './transformation';

export interface ResponsiveImageLoaderConfig {
  paths: PathsConfig;
  conversion: ConversionConfig;
  artDirection: TransformationConfig;
  resolutionSwitching: ResizingConfig;
}

export const OPTIONS_SCHEMA = deepFreeze({
  type: 'object',
  properties: {
    paths: {
      type: 'object',
      properties: {
        outputDir: { type: 'string' },
        // TODO: add more adherent properties check if possible
        aliases: { type: 'object' },
      },
      additionalProperties: false,
    },
    conversion: {
      type: 'object',
      properties: {
        converter: {
          oneOf: [
            { type: 'null' },
            { type: 'string' },
            { instanceof: 'Function' },
          ],
        },
        enabledFormats: {
          type: 'object',
          properties: {
            webp: { type: 'boolean' },
            jpg: { type: 'boolean' },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    artDirection: {
      type: 'object',
      properties: {
        transformer: {
          oneOf: [
            { type: 'null' },
            { type: 'string' },
            { instanceof: 'Function' },
          ],
        },
        aliases: { type: 'object' },
        defaultRatio: { type: 'string' },
        defaultSize: { type: 'number' },
        // TODO: add more adherent properties check if possible
        defaultTransformations: { type: 'object' },
      },
      additionalProperties: false,
    },
    resolutionSwitching: {
      type: 'object',
      properties: {
        resizer: {
          oneOf: [
            { type: 'null' },
            { type: 'string' },
            { instanceof: 'Function' },
          ],
        },
        supportRetina: { type: 'boolean' },
        minViewport: { type: 'number' },
        maxViewport: { type: 'number' },
        maxBreakpointsCount: { type: 'number' },
        minSizeDifference: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
});
