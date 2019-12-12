import { loader } from 'webpack';
import { Breakpoint, SupportedImageFormats } from '../models';

export type ConversionAdapter = (
  this: loader.LoaderContext,
  sourcePath: string,
  destinationPath: string,
  uriWithoutHash: string,
  format: SupportedImageFormats
) => Promise<Breakpoint>;

export type ConversionAdapterPresets = 'sharp';
