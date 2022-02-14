import { ResponsiveImageLoaderContext } from 'src/config';
import { Breakpoint, SupportedImageFormats } from 'src/base';

export type ConversionAdapter = (
  this: ResponsiveImageLoaderContext,
  sourcePath: string,
  destinationPath: string,
  uriWithoutHash: string,
  format: SupportedImageFormats,
) => Promise<Breakpoint>;

export type ConversionAdapterPresets = 'sharp';
