import { BaseConfig } from './base';
import { ConversionConfig } from './conversion';
import { deepFreeze } from './helpers';
import { ResizingConfig } from './resizing';
import { TransformationConfig } from './transformation';

export interface ResponsiveImageLoaderConfig extends BaseConfig {
  conversion: ConversionConfig;
  artDirection: TransformationConfig;
  resolutionSwitching: ResizingConfig;
}

export const OPTIONS_SCHEMA = deepFreeze({
  type: 'object',
  properties: {
    defaultSize: { type: 'number' },
    viewportAliases: { type: 'object' },
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
        defaultRatio: { type: 'string' },
        // TODO: add more adherent properties check if possible
        // TODO: turn it around to put the focus on ratio and path
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
