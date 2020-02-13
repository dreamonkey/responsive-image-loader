import { defaults, isNull, isUndefined, mapValues, max } from 'lodash';
import { lookup } from 'mime-types';
import { resolve } from 'path';
import { Dictionary } from 'ts-essentials';
import {
  BaseResponsiveImage,
  Breakpoint,
  getPathAliases,
  resolveAliases,
  SizesMap,
} from './base';
import { byMostEfficientFormat, ConversionResponsiveImage } from './conversion';
import { byIncreasingWidth } from './resizing';
import {
  byIncreasingMaxViewport,
  decodeTransformation,
  isTransformationSource,
  TransformationResponsiveImage,
} from './transformation';

export type ResponsiveImage =
  | BaseResponsiveImage
  | TransformationResponsiveImage;

const IMAGES_PATTERN = /<img.*?\/>/gs;
const ATTRIBUTES_PATTERN = /^<img(?=.*\sresponsive(?:="(\S+)")?\s.*)(?=.*\ssrc="(\S+)"\s.*).*\/>$/s;
const OPTION_PATTERN = /([^\s{]+)(?:{([\w|]+)})?/;
// For all subsequent patterns, only the first match is taken into account
const CLASS_PATTERN = /class="([^"]+)"/;
const IMG_CLASS_PATTERN = /responsive-img-class(?:="([^"]+)")?/;
const PICTURE_CLASS_PATTERN = /responsive-picture-class(?:="([^"]+)")?/;
const ART_DIRECTION_ATTRIBUTE_PATTERN = /responsive-ad(?:="(\S+)")?/;
const ART_DIRECTION_IGNORE_ATTRIBUTE_PATTERN = /responsive-ad-ignore(?:="(\S+)")?/;

const imagesMatchesMap: { [index: string]: string } = {};

function generatePlaceholder(path: string): string {
  return `[[responsive:${path}]]`;
}

// Aliases are resolved relative to root level
function resolvePathAliases(
  rootContext: string,
  imagePath: string,
): string[] | undefined {
  for (const [pathAlias, pathAliasValue] of getPathAliases()) {
    if (imagePath.startsWith(pathAlias)) {
      return [rootContext, pathAliasValue, imagePath.slice(pathAlias.length)];
    }
  }

  return undefined;
}

function parseProperties(content: string): Dictionary<Dictionary<string>> {
  const propertiesMap: Dictionary<Dictionary<string>> = {};

  for (const property of content.split(';')) {
    const [name, options] = property.split('=');
    const parsedOptions = options.split(',');

    const viewportsMap: Dictionary<string> = {};

    for (const option of parsedOptions) {
      const optionResult = OPTION_PATTERN.exec(option);

      if (isNull(optionResult)) {
        throw new Error(`Option ${option} is malformed`);
      }

      const [, value, viewports] = optionResult;

      // If no viewports are specified, the value is marked to override the global default
      // TODO: mention that specifying "__default" is the same as omitting it
      if (isUndefined(viewports)) {
        viewportsMap.__default = value;
      } else {
        const parsedViewports = viewports.split('|');

        for (const viewport of parsedViewports) {
          viewportsMap[viewport] = value;
        }
      }
    }

    propertiesMap[name] = viewportsMap;
  }

  return propertiesMap;
}

function parseSizeProperty(
  responsiveOptions: string,
  defaultSize: number,
  viewportAliases: Dictionary<string>,
): SizesMap {
  const sizes = !isUndefined(responsiveOptions)
    ? mapValues(parseProperties(responsiveOptions).size, Number)
    : {};

  // If no default size has been set via inline options, we add the global default size
  // We need to resolve aliases because sizes will be picked in multiple modules
  //   based on their resolved aliases name
  const sizesWithoutAliases = defaults(resolveAliases(sizes, viewportAliases), {
    __default: defaultSize,
  });

  return mapValues(
    sizesWithoutAliases as SizesMap,
    size =>
      // Caps size to a given lower bound
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      max([size, 0.1])!,
  );
}

// TODO: manage webpack aliases automatically
export function resolveImagePath(
  rootContext: string,
  context: string,
  imagePath: string,
): string {
  // If no alias is found, we resolve it like a path relative to
  //  the processed file location
  return resolve(
    ...(resolvePathAliases(rootContext, imagePath) ?? [context, imagePath]),
  );
}

export function parse(
  context: string,
  rootContext: string,
  source: string,
  defaultSize: number,
  viewportAliases: Dictionary<string>,
): {
  sourceWithPlaceholders: string;
  parsedImages: ResponsiveImage[];
} {
  const responsiveImages: ResponsiveImage[] = [];
  // We reduce Buffer to a string using `toString` to be able to apply a RegExp
  const imageTags = source.match(IMAGES_PATTERN) ?? [];
  for (const imageTag of imageTags) {
    const attributesMatches = ATTRIBUTES_PATTERN.exec(imageTag);

    if (isNull(attributesMatches)) {
      // The tag doesn't have valid "responsive" or "src" attributes
      continue;
    }

    const [, responsiveOptions, imagePath] = attributesMatches;

    const resolvedPath = resolveImagePath(rootContext, context, imagePath);

    imagesMatchesMap[resolvedPath] = imageTag;

    const responsiveImage: ResponsiveImage = {
      originalPath: resolvedPath,
      sources: [],
      options: {
        sizes: parseSizeProperty(
          responsiveOptions,
          defaultSize,
          viewportAliases,
        ),
      },
    };

    const artDirectionMatches = ART_DIRECTION_ATTRIBUTE_PATTERN.exec(imageTag);
    if (!isNull(artDirectionMatches)) {
      const [, encodedTransformations] = artDirectionMatches;

      const artDirectionIgnoreMatches = ART_DIRECTION_IGNORE_ATTRIBUTE_PATTERN.exec(
        imageTag,
      );

      ((responsiveImage as unknown) as TransformationResponsiveImage).options.inlineArtDirection = {
        // Even if typings doesn't reflect so, capturing groups with no match returns undefined
        inlineTransformations: !isUndefined(encodedTransformations)
          ? decodeTransformation(
              imagePath,
              parseProperties(encodedTransformations),
            )
          : {},
        transformationsToIgnore: isNull(artDirectionIgnoreMatches)
          ? false
          : isUndefined(artDirectionIgnoreMatches[1])
          ? true
          : artDirectionIgnoreMatches[1].split('|'),
      };
    }

    responsiveImages.push(responsiveImage);

    source = source.replace(imageTag, generatePlaceholder(resolvedPath));
  }

  return { sourceWithPlaceholders: source, parsedImages: responsiveImages };
}

function generateSrcSet(breakpoints: Breakpoint[]): string {
  if (breakpoints.length === 1) {
    return breakpoints[0].uriWithHash;
  }

  return breakpoints
    .sort(byIncreasingWidth)
    .map(({ uriWithHash, width }) => `${uriWithHash} ${width}w`)
    .join(', ');
}

export function enhance(
  source: string,
  images: ConversionResponsiveImage[],
): string {
  // TODO: prevent <picture> generation when art direction and conversion are disabled,
  //  using only srcset

  for (const image of images) {
    const imageMatch = imagesMatchesMap[image.originalPath];

    let enhancedImage;

    if (image.sources.length === 0) {
      // We just leave the original img tag if no sources has been generated
      enhancedImage = imageMatch;
    } else {
      const originalClass = CLASS_PATTERN.exec(imageMatch)?.[1] ?? '';

      const responsiveImgClassMatches = IMG_CLASS_PATTERN.exec(imageMatch);
      const responsiveImgClass = isNull(responsiveImgClassMatches)
        ? originalClass
        : responsiveImgClassMatches[1] ?? '';

      const responsivePictureClassMatches = PICTURE_CLASS_PATTERN.exec(
        imageMatch,
      );
      const responsivePictureClass = isNull(responsivePictureClassMatches)
        ? originalClass
        : responsivePictureClassMatches[1] ?? '';

      const sortedSources = image.sources
        .sort(byIncreasingMaxViewport)
        .sort(byMostEfficientFormat);

      // When we have no conversions and no art-direction we could avoid using 'picture'
      // We use it anyway to always leave the original tag image "as-is" as fallback
      enhancedImage = `<picture class="${responsivePictureClass}">\n`;
      for (const source of sortedSources) {
        const { breakpoints, format } = source;

        enhancedImage += '<source ';
        enhancedImage += `type="${lookup(format)}" `;

        // 'media' attribute must be set before 'srcset' for testing purposes
        if (isTransformationSource(source)) {
          enhancedImage += `sizes="${
            source.size > 1.0 ? `${source.size}px` : `${source.size * 100}vm`
          }" `;
          enhancedImage += `media="(max-width: ${source.maxViewport}px)" `;
        }

        enhancedImage += `srcset="${generateSrcSet(breakpoints)}" `;
        enhancedImage += '/>\n';
      }

      // Img tag is on bottom to preserve increasing image size sort-order
      // Img tag is copied as-is to preserve original attributes
      enhancedImage +=
        imageMatch.replace(CLASS_PATTERN, `class="${responsiveImgClass}"`) +
        '\n';
      enhancedImage += '</picture>\n';
    }

    source = source.replace(
      generatePlaceholder(image.originalPath),
      enhancedImage,
    );
  }

  return source;
}
