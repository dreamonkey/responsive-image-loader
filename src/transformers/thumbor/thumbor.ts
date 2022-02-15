import { ChildProcess, exec, spawn } from 'child_process';
import { writeFileSync } from 'fs';
import got from 'got';
import { map } from 'lodash';
import { join, parse } from 'path';
import { getTempImagesDir } from '../../base';
import { ResponsiveImageLoaderContext } from '../../config';
import {
  generateTransformationUri,
  isCustomTransformation,
  TransformationDescriptor,
  TransformationSource,
} from '../../transformation';
import { TransformationAdapter } from '../transformers';

const THUMBOR_URL = 'http://localhost';
const THUMBOR_PORT = '8888';
const THUMBOR_ENV_PATH = join(__dirname, '.thumbor-env');
// This is the default into MinimalCompact/thumbor configuration
const THUMBOR_FILE_LOADER_ROOT_PATH = '/data/loader';
const CURRENT_WORKING_DIRECTORY_PATH = process.cwd();

const DOCKER_CONTAINER_NAME = 'ril-thumbor';

let DOCKER_PROCESS: ChildProcess | undefined;
let DOCKER_PROCESS_KILL_TIMEOUT: NodeJS.Timeout;
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
  path = path.replace(CURRENT_WORKING_DIRECTORY_PATH, '');

  return urlStart + cropping + urlSmart + path;
}

function createFiles(
  this: ResponsiveImageLoaderContext,
  imagePath: string,
  transformations: TransformationDescriptor[],
): Promise<TransformationSource[]> {
  return Promise.all(
    map(transformations, async (transformation) => {
      const url = generateTransformationUrl(imagePath, transformation);

      try {
        const result = await got(url).buffer();

        const { uri, uriWithHash } = generateTransformationUri(
          imagePath,
          result,
          transformation,
        );

        const { base } = parse(uri);
        const path = join(getTempImagesDir(), base);

        this.emitFile(uriWithHash, result);
        writeFileSync(path, result);

        return {
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
        };
      } catch (e) {
        this.emitError(e as Error);
        throw e;
      }
    }),
  );
}

function thumborReady(): Promise<void> {
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
      isReady = (await got(healthcheckUrl).text()) === 'WORKING';
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
export const thumborDockerTransformer: TransformationAdapter = async function (
  imagePath,
  transformations,
) {
  JOBS_IN_QUEUE++;

  if (!DOCKER_PROCESS) {
    DOCKER_PROCESS = spawn(
      'docker',
      [
        'run',
        '-p',
        `${THUMBOR_PORT}:80`,
        '--name',
        DOCKER_CONTAINER_NAME,
        '--env-file',
        THUMBOR_ENV_PATH,
        '--mount',
        `type=bind,source=${process.cwd()},target=${THUMBOR_FILE_LOADER_ROOT_PATH},readonly`,
        '--rm',
        'minimalcompact/thumbor',
      ],
      // Shows output into the console
      { stdio: 'inherit' },
    );
    DOCKER_PROCESS.on('error', (err) =>
      this.emitError(
        new Error(
          `An error has been thrown while running the docker container with text "${err.message}", have you installed docker and run "docker pull minimalcompact/thumbor"?`,
        ),
      ),
    );

    DOCKER_PROCESS_KILL_TIMEOUT = setTimeout(() => {
      if (JOBS_IN_QUEUE === 0) {
        DOCKER_PROCESS?.kill();
        exec(`docker container stop ${DOCKER_CONTAINER_NAME}`);
      } else {
        DOCKER_PROCESS_KILL_TIMEOUT = DOCKER_PROCESS_KILL_TIMEOUT.refresh();
      }
    }, 2000);
  }

  await thumborReady();

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
