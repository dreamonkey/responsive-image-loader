import { isNull, isUndefined } from 'lodash';
import { lookup } from 'mime-types';
import { resolve } from 'path';
import { byMostEfficientFormat, ConversionResponsiveImage } from './conversion';
import { BaseResponsiveImage, Breakpoint, getPathAliases } from './models';
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
const ATTRIBUTES_PATTERN = /^<img(?=.*\sresponsive\s.*)(?=.*\ssrc="(\S+)"\s.*).*\/>$/s;
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

    const [, imagePath] = attributesMatches;

    const resolvedPath = resolveImagePath(rootContext, context, imagePath);

    imagesMatchesMap[resolvedPath] = imageTag;

    const responsiveImage: ResponsiveImage = {
      originalPath: resolvedPath,
      sources: [],
    };

    const artDirectionMatches = ART_DIRECTION_ATTRIBUTE_PATTERN.exec(imageTag);
    if (!isNull(artDirectionMatches)) {
      const [, encodedTransformations] = artDirectionMatches;

      const artDirectionIgnoreMatches = ART_DIRECTION_IGNORE_ATTRIBUTE_PATTERN.exec(
        imageTag,
      );

      (responsiveImage as TransformationResponsiveImage).options = {
        // Even if typings doesn't reflect so, capturing groups with no match returns undefined
        inlineArtDirection: {
          inlineTransformations: !isUndefined(encodedTransformations)
            ? decodeTransformation(imagePath, encodedTransformations)
            : {},
          transformationsToIgnore: isNull(artDirectionIgnoreMatches)
            ? false
            : isUndefined(artDirectionIgnoreMatches[1])
            ? true
            : artDirectionIgnoreMatches[1].split('|'),
        },
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          enhancedImage += `sizes="${source.size! * 100}vm" `;
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
