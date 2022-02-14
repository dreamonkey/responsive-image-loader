import { ResponsiveImageLoaderContext } from 'src/config';
import { Breakpoint } from 'src/base';

export type ResizingAdapter = (
  this: ResponsiveImageLoaderContext,
  sourcePath: string,
  destinationPath: string,
  breakpointWindth: number,
) => Promise<Breakpoint>;

export type ResizingAdapterPresets = 'sharp';
