import { ChildProcess, spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { map } from 'lodash';
import { join, parse } from 'path';
import request from 'request';
import { loader } from 'webpack';
import { getTempImagesDir } from '../../base';
import {
  generateTransformationUri,
  isCustomTransformation,
  TransformationDescriptor,
  TransformationSource,
} from '../../transformation';
import { TransformationAdapter } from '../transformers';

const THUMBOR_URL = 'http://localhost';
const THUMBOR_PORT = '8888';
const THUMBOR_CONFIGURATION_PATH = join(__dirname, 'thumbor.conf');
// This is duplicated from `thumbor.conf`
// Read comments there for context
const THUMBOR_FILE_LOADER_ROOT_PATH = '/home/';

let THUMBOR_PROCESS: ChildProcess | undefined;
let THUMBOR_PROCESS_KILL_TIMEOUT: NodeJS.Timeout;
let JOBS_IN_QUEUE = 0;

function generateTransformationUrl(
  imagePath: string,
  transformation: TransformationDescriptor,
): string {
  const urlStart = `${THUMBOR_URL}:${THUMBOR_PORT}/unsafe/`;
  const urlSmart = '/smart/';
  const { size, maxViewport } = transformation;
  const scaledViewport = Math.ceil(maxViewport * size);

  let cropping: string;
  let path: string;

  if (isCustomTransformation(transformation)) {
    // Custom transformations should already be at the right dimension,
    //  we just resize them to be maximum of the given viewport size
    cropping = `${scaledViewport}x0`;
    path = transformation.path;
  } else {
    const { ratio } = transformation;
    const [horizontalRatio, verticalRatio] =
      ratio === 'original' ? [] : map(ratio.split(':'), Number);

    const cropWidth = scaledViewport;
    const cropHeight =
      ratio === 'original'
        ? 0
        : Math.ceil((cropWidth / horizontalRatio) * verticalRatio);

    cropping = `${cropWidth}x${cropHeight}`;
    path = imagePath;
  }
  path = path.replace(THUMBOR_FILE_LOADER_ROOT_PATH, '');

  return urlStart + cropping + urlSmart + path;
}

function createFiles(
  this: loader.LoaderContext,
  imagePath: string,
  transformations: TransformationDescriptor[],
): Promise<TransformationSource[]> {
  return Promise.all(
    map(
      transformations,
      (transformation) =>
        new Promise<TransformationSource>((resolve, reject) => {
          let result: Buffer;
          const url = generateTransformationUrl(imagePath, transformation);

          try {
            // "http" native library throwed
            // `[ERR_STREAM_CANNOT_PIPE] [ERR_STREAM_CANNOT_PIPE]: Cannot pipe, not readable`
            // with this same code, for unknown reasons, so we switched to "request"
            // `{ encoding: null }` is needed to get the body as a binary Buffer
            //  because default behaviour is to transform it into a string
            // See: https://github.com/request/request#requestoptions-callback > 'encoding' property
            request(url, { encoding: null }, (error, response, body) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              result = body;
            }).on('close', () => {
              const { uri, uriWithHash } = generateTransformationUri(
                imagePath,
                result,
                transformation,
              );

              const { base } = parse(uri);
              const path = `${getTempImagesDir()}/${base}`;

              this.emitFile(uriWithHash, result, {});
              writeFileSync(path, result);

              resolve({
                ...transformation,
                path,
                breakpoints: [
                  {
                    path,
                    uri,
                    uriWithHash,
                    width: transformation.maxViewport * transformation.size,
                  },
                ],
              });
            });
          } catch (e) {
            this.emitError(e);
            reject(e);
          }
        }),
    ),
  );
}

function thumborProcessReady(): Promise<void> {
  const healthcheckUrl = `${THUMBOR_URL}:${THUMBOR_PORT}/healthcheck`;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // Wait thumbor process to initialize
    // Waiting 100ms seems to work, even without the healthcheck,
    // If we omit the initial waiting, all healthcheck requests fails
    // This behaviour is still unexplained
    await new Promise((resolve2) => setTimeout(resolve2, 100));
    let isReady = false;
    let retries = 0;
    while (!isReady && retries < 10) {
      isReady = await new Promise<boolean>((resolve3) => {
        request(healthcheckUrl, (error, response, body) => {
          resolve3(body === 'WORKING' ? true : false);
        });
      });
      retries++;
      await new Promise((resolve4) => setTimeout(resolve4, 150));
    }

    if (retries === 10) {
      reject();
    }

    resolve();
  });
}

// Do not use lambda functions, they won't retain `this` context
export const thumborTransformer: TransformationAdapter = async function (
  imagePath,
  transformations,
) {
  JOBS_IN_QUEUE++;

  // Previously we spawned one process for every transformation, but it caused URI conflicts
  if (!THUMBOR_PROCESS) {
    THUMBOR_PROCESS = spawn(
      'thumbor',
      ['--port', THUMBOR_PORT, '--conf', THUMBOR_CONFIGURATION_PATH],
      // Shows output from thumbor process into the console
      { stdio: 'inherit' },
    );
    THUMBOR_PROCESS_KILL_TIMEOUT = setTimeout(() => {
      if (JOBS_IN_QUEUE === 0) {
        THUMBOR_PROCESS?.kill();
      } else {
        THUMBOR_PROCESS_KILL_TIMEOUT = THUMBOR_PROCESS_KILL_TIMEOUT.refresh();
      }
    }, 2000);
  }

  await thumborProcessReady();

  const transformationSources: TransformationSource[] = [];

  try {
    transformationSources.push(
      ...(await createFiles.call(this, imagePath, transformations)),
    );
  } catch (e) {
    console.error(e);
  }

  JOBS_IN_QUEUE--;
  return transformationSources;
};
