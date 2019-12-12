import { loader } from 'webpack';
import { Breakpoint } from '../models';

export type ResizingAdapter = (
  this: loader.LoaderContext,
  sourcePath: string,
  destinationPath: string,
  breakpointWindth: number
) => Promise<Breakpoint>;

export type ResizingAdapterPresets = 'sharp';
