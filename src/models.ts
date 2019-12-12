import { existsSync, mkdirSync } from 'fs';
import { getHashDigest } from 'loader-utils';
import { parse } from 'path';

const TEMP_DIR = 'dist/temp';
const TEMP_IMAGES_DIR = `${TEMP_DIR}/images`;

export function existsOrCreateDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getTempDir(): string {
  existsOrCreateDirectory(TEMP_DIR);
  return TEMP_DIR;
}

export function getTempImagesDir(): string {
  existsOrCreateDirectory(TEMP_IMAGES_DIR);
  return TEMP_IMAGES_DIR;
}

export enum SupportedImageFormats {
  WebP = 'webp',
  Jpeg = 'jpg',
}

export interface Breakpoint {
  path: string;
  uri: string;
  uriWithHash: string;
  width: number;
}

export interface BaseSource {
  path: string;
  breakpoints: Breakpoint[];
}

export interface BaseResponsiveImage {
  originalPath: string;
  sources: BaseSource[];
}

export function generateUri(
  path: string,
  content: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uriBodyGenerator: (...args: any[]) => string,
): { uri: string; uriWithHash: string } {
  const hash = getHashDigest(content, 'md5', 'hex', 8);
  const { name: filename, ext: extension } = parse(path);
  // TODO: '/img' is hardcoded, make it configurable or flexible
  const uriStart = `/img/${filename}`;
  const uriBody = uriBodyGenerator();

  return {
    uri: uriStart + uriBody + extension,
    uriWithHash: uriStart + uriBody + '.' + hash + extension,
  };
}
