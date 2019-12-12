import { loader } from 'webpack';
import {
  TransformationDescriptor,
  TransformationSource
} from '../transformation';

// Do not use lambda functions, they won't retain `this` context
export type TransformationAdapter = (
  this: loader.LoaderContext,
  imagePath: string,
  transformations: TransformationDescriptor[]
) => Promise<TransformationSource[]>;

export type TransformationAdapterPresets = 'thumbor';
