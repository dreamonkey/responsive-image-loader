import {
  defaults,
  drop,
  each,
  has,
  isNull,
  isUndefined,
  map,
  mapKeys,
  max,
  merge,
  min,
  omit,
} from 'lodash';
import { DeepRequired, Dictionary } from 'ts-essentials';
import { loader } from 'webpack';
import { AtLeastOne, deepFreeze } from './helpers';
import { BaseResponsiveImage, BaseSource, generateUri } from './models';
import { ResponsiveImage } from './parsing';
import { thumborTransformer } from './transformers/thumbor';
import {
  TransformationAdapter,
  TransformationAdapterPresets,
} from './transformers/transformers';

export function capSize(value: number): number {
  return max([min([value, 1.0])!, 0.1])!;
}

interface BaseTransformationDescriptor {
  maxViewport: number;
  size: number;
}

interface ProcessableTransformationDescriptor
  extends BaseTransformationDescriptor {
  ratio: string;
}

interface CustomTransformationDescriptor extends BaseTransformationDescriptor {
  path: string;
}

export type TransformationDescriptor =
  | ProcessableTransformationDescriptor
  | CustomTransformationDescriptor;

export function isCustomTransformation(
  transformation: TransformationDescriptor,
): transformation is CustomTransformationDescriptor {
  return has(transformation, 'path');
}

type Transformation =
  | { path: string; size?: number }
  | AtLeastOne<{ ratio: string; size: number }>;

interface TransformationMap {
  [index: string]: Transformation;
}

interface TransformationInlineOptions {
  inlineTransformations: TransformationMap;
  transformationsToIgnore: boolean | string[];
}

export type TransformationSource = BaseSource & {
  maxViewport: number;
} & Transformation;

export interface TransformationResponsiveImage extends BaseResponsiveImage {
  options: {
    inlineArtDirection: TransformationInlineOptions;
  };
  sources: (BaseSource | TransformationSource)[];
}

export function isTransformationResponsiveImage(
  responsiveImage: ResponsiveImage,
): responsiveImage is TransformationResponsiveImage {
  return !!(responsiveImage as TransformationResponsiveImage).options
    ?.inlineArtDirection;
}

export function isTransformationSource(
  source: BaseSource | TransformationSource,
): source is TransformationSource {
  return !!(source as TransformationSource).maxViewport;
}

export function byIncreasingMaxViewport(
  a: BaseSource | TransformationSource,
  b: BaseSource | TransformationSource,
): number {
  if (isTransformationSource(a) && isTransformationSource(b)) {
    return a.maxViewport - b.maxViewport;
  }

  if (!isTransformationSource(a) && !isTransformationSource(b)) {
    return 0;
  }

  // Sources without maxViewport are last
  return !isTransformationSource(a) ? 1 : -1;
}

export function decodeTransformation(
  imagePath: string,
  encodedTransformations: string,
): TransformationMap {
  const transformations: TransformationMap = {};

  // TODO: check well-formness of encoded transformations via regexp
  // TODO: eventually extract it with the same RegEx

  for (const encodedTransformation of encodedTransformations.split(';')) {
    const [name, encodedOptions] = encodedTransformation.split('_');

    const optionsMap = encodedOptions
      .slice(1, encodedOptions.length - 1)
      .split(',')
      .reduce((previous, current) => {
        const [optionName, optionValue] = current.split('=');
        previous[optionName] = optionValue;
        return previous;
      }, {} as Dictionary<string>);

    const optionsKeys = Object.keys(optionsMap);

    // Converts size to number
    const size = !isUndefined(optionsMap['size'])
      ? Number(optionsMap['size'])
      : undefined;
    // Custom transformation take precedence on other options
    if (optionsKeys.includes('path')) {
      transformations[name] = {
        path: optionsMap['path'],
        size,
      };
    } else if (optionsKeys.includes('ratio') || optionsKeys.includes('size')) {
      transformations[name] = {
        ratio: optionsMap['ratio'],
        size,
      };
    } else {
      throw new Error(
        `Inline transformation ${name} for image ${imagePath} has no valid options`,
      );
    }
  }

  return transformations;
}

interface TransformationAliasesMap {
  [index: string]: string;
}

export interface TransformationConfig {
  transformer: TransformationAdapterPresets | TransformationAdapter | null;
  aliases: TransformationAliasesMap;
  defaultRatio: string;
  defaultSize: number;
  defaultTransformations: TransformationMap;
}

const MAX_VIEWPORT_PATTERN = /^(\d+)$/;

function resolveAliases(
  transformations: TransformationMap,
  aliases: TransformationAliasesMap,
): TransformationMap {
  return mapKeys(transformations, (_, name) => {
    const nameWithoutAliases = isUndefined(aliases[name])
      ? name
      : aliases[name];
    return nameWithoutAliases;
  });
}

function validateTransformationName(name: string): void {
  if (!MAX_VIEWPORT_PATTERN.test(name)) {
    throw new Error(
      `${name} is not a valid transformation name. Have you used an alias without defining it?`,
    );
  }
}

function generateDescriptors(
  transformations: DeepRequired<TransformationMap>,
): TransformationDescriptor[] {
  return map(transformations, (transformation, name) => {
    // We only need capturing groups, full match element is dropped
    const [maxViewport] = map(
      drop(name.match(MAX_VIEWPORT_PATTERN), 1),
      Number,
    );

    return {
      ...transformation,
      maxViewport,
    };
  });
}

export function normalizeTransformations(
  {
    inlineTransformations,
    transformationsToIgnore,
  }: TransformationInlineOptions,
  {
    aliases,
    defaultRatio,
    defaultSize,
    defaultTransformations,
    transformer,
  }: TransformationConfig,
): TransformationDescriptor[] {
  if (isNull(transformer)) {
    return [];
  }

  const filteredDefaultTransformations =
    transformationsToIgnore === false
      ? defaultTransformations // Keep all default transformation
      : transformationsToIgnore === true
      ? {} // Remove all default transformation
      : omit(defaultTransformations, transformationsToIgnore); // Remove specified transformations

  const transformations = merge(
    {},
    resolveAliases(filteredDefaultTransformations, aliases),
    resolveAliases(inlineTransformations, aliases),
  );

  const transformationNames = Object.keys(transformations);

  if (transformationNames.length === 0) {
    return [];
  }

  each(transformationNames, validateTransformationName);
  each(transformations, transformation => {
    const defaultValues = has(transformation, 'path')
      ? { size: defaultSize } // With custom transformations
      : { ratio: defaultRatio, size: defaultSize }; // With processable transformations
    defaults(transformation, defaultValues);
    transformation.size = capSize(transformation.size!);
  });

  return generateDescriptors(
    transformations as DeepRequired<TransformationMap>,
  );
}

export const generateTransformationUri = (
  path: string,
  content: Buffer,
  transformation: TransformationDescriptor,
): ReturnType<typeof generateUri> =>
  generateUri(path, content, () => {
    const { maxViewport, size } = transformation;
    // 'tb' stands for 'transformation breakpoint'
    let pathBody = `-tb_${maxViewport}`;

    if (isCustomTransformation(transformation)) {
      // 'p' stands for 'path'
      // 's' stands for 'size'
      pathBody += `-p-s_${size * 100}`;
    } else {
      const { ratio } = transformation;
      // 'r' stands for 'ratio'
      // 's' stands for 'size'
      pathBody += `-r_${ratio.replace(':', '_')}-s_${size * 100}`;
    }

    return pathBody;
  });

type TransformationAdapterPresetsMap = {
  [index in TransformationAdapterPresets]: TransformationAdapter;
};

const presetTransformers: TransformationAdapterPresetsMap = deepFreeze({
  thumbor: thumborTransformer,
});

export function transformImage(
  this: loader.LoaderContext,
  imagePath: string,
  transformations: TransformationDescriptor[],
  transformer: TransformationConfig['transformer'],
): Promise<TransformationSource[]> {
  if (isNull(transformer) || transformations.length === 0) {
    return Promise.resolve([]);
  }

  if (typeof transformer === 'string') {
    transformer = presetTransformers[transformer];
  }

  return transformer.call(this, imagePath, transformations);
}
