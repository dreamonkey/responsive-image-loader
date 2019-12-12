import { isNull, isUndefined } from 'lodash';
import { lookup } from 'mime-types';
import * as path from 'path';
import { byMostEfficientFormat, ConversionResponsiveImage } from './conversion';
import {
  byIncreasingMaxViewport,
  decodeTransformation,
  isTransformationSource,
  TransformationResponsiveImage,
} from './transformation';
import { BaseResponsiveImage, Breakpoint } from './models';
import { byIncreasingWidth } from './resizing';

export type ResponsiveImage =
  | BaseResponsiveImage
  | TransformationResponsiveImage;

const IMAGES_PATTERN = /<img.*?\/>/gs;
const ATTRIBUTES_PATTERN = /^<img(?=.*\sresponsive\s.*)(?=.*\ssrc="(\S+)"\s.*).*\/>$/s;
const ART_DIRECTION_ATTRIBUTE_PATTERN = /responsive-ad(?:="(\S+)")?/;
const ART_DIRECTION_IGNORE_ATTRIBUTE_PATTERN = /responsive-ad-ignore(?:="(\S+)")?/;

const imagesMatchesMap: { [index: string]: string } = {};

function generatePlaceholder(path: string): string {
  return `[[responsive:${path}]]`;
}

export function parse(
  rootContext: string,
  source: string,
): {
  sourceWithPlaceholders: string;
  parsedImages: ResponsiveImage[];
} {
  // TODO: Find a way to use webpack resolve system to reverse used aliases
  const appPath = `${rootContext}/src`;

  const responsiveImages: ResponsiveImage[] = [];
  // We reduce Buffer to a string using `toString` to be able to apply a RegExp
  const imageTags = source.match(IMAGES_PATTERN) ?? [];
  for (const imageTag of imageTags) {
    const attributesMatches = imageTag.match(ATTRIBUTES_PATTERN);

    if (isNull(attributesMatches)) {
      // The tag doesn't have valid "responsive" or "src" attributes
      continue;
    }

    const [, imagePath] = attributesMatches;

    const resolvedPath = path.resolve(
      appPath,
      imagePath.startsWith('~') ? imagePath.slice(1) : imagePath,
    );

    imagesMatchesMap[resolvedPath] = imageTag;

    const responsiveImage: ResponsiveImage = {
      originalPath: resolvedPath,
      sources: [],
    };

    const artDirectionMatches = imageTag.match(ART_DIRECTION_ATTRIBUTE_PATTERN);
    if (!isNull(artDirectionMatches)) {
      const [, encodedTransformations] = artDirectionMatches;

      const artDirectionIgnoreMatches = imageTag.match(
        ART_DIRECTION_IGNORE_ATTRIBUTE_PATTERN,
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
  for (const image of images) {
    const sortedSources = image.sources
      .sort(byIncreasingMaxViewport)
      .sort(byMostEfficientFormat);

    // When we have no conversions and no art-direction we could avoid using 'picture'
    // We use it anyway to always leave the original tag image "as-is" as fallback
    let enhancedImage = '<picture>\n';
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
    enhancedImage += imagesMatchesMap[image.originalPath] + '\n';
    enhancedImage += '</picture>\n';
    source = source.replace(
      generatePlaceholder(image.originalPath),
      enhancedImage,
    );
  }
  return source;
}
