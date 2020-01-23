import { compiler } from './compiler';
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { existsOrCreateDirectory } from 'src/models';

const TEMP_DIR = 'dist/temp/test';

async function setup(
  entryPath: string,
  options: Parameters<typeof compiler>[1] = {},
): Promise<string> {
  const stats = await compiler(entryPath, options);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const moduleData = stats.toJson().modules![0].source!;

  existsOrCreateDirectory(TEMP_DIR);

  const hash = createHash('md5')
    .update(moduleData)
    .digest('hex');
  const tempFileName = join(TEMP_DIR, `${hash}.js`);
  const path = resolve(__dirname, '..', tempFileName);
  writeFileSync(path, moduleData);

  const sourceWithEscapedQuotes = (await import(path)).default as string;

  return sourceWithEscapedQuotes.replace(/\\"/g, '"');
}

describe('Responsive image loader', () => {
  describe('conversion disabled', () => {
    const conversionDisabled = { conversion: { converter: null } };

    describe('resolution switching disabled', () => {
      const resolutionSwitchingDisabled = {
        resolutionSwitching: { resizer: null },
      };

      it.todo(
        'should not perform conversions when no converter is specified',
        // async () => {
        //   // const output = await setup('./assets/single-image.html');
        // },
      );

      describe('art direction enabled', () => {
        it('should not be performed when no transformer is provided', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: { transformer: null },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).not.toMatch(/<picture>/);
        });

        it('should not be performed when no transformations are provided', async () => {
          const output = await setup('./assets/single-image.html', {
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).not.toMatch(/<picture>/);
        });

        it('should add mime type when at least one transformation is defined', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              defaultTransformations: {
                '1200': { ratio: '2:3', size: 1.0 },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).toMatch(
            /<picture>.*<source.*type="image\/jpeg".*srcset=".*\.jpg.*".*\/>.*<\/picture>/gs,
          );
        });

        it('should apply transformations when defined as defaults', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              defaultTransformations: {
                '1200': { ratio: '2:3', size: 1.0 },
                '1500': { ratio: '16:9', size: 0.5 },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 1200px\)".*srcset=".*\/example-tb_1200-r_2_3-s_100.*\.jpg.*".*\/>.*<\/picture>/s,
          );
          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 1500px\)".*srcset=".*\/example-tb_1500-r_16_9-s_50.*\.jpg.*".*\/>.*<\/picture>/s,
          );
        });

        it('should apply transformation when defined via inline options', async () => {
          const output = await setup(
            './assets/single-image-inline-config.html',
            {
              artDirection: {
                transformer: 'thumbor',
                aliases: {
                  xs: '600',
                  md: '1023',
                },
              },
              ...conversionDisabled,
              ...resolutionSwitchingDisabled,
            },
          );

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\/example-tb_600-r_3_2-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
        });

        it('should merge inline options with default transformations when both are provided', async () => {
          const output = await setup(
            './assets/single-image-inline-config.html',
            {
              artDirection: {
                transformer: 'thumbor',
                aliases: {
                  xs: '600',
                  md: '1023',
                },
                defaultTransformations: {
                  xs: { ratio: '5:3', size: 0.5 },
                },
              },
              ...conversionDisabled,
              ...resolutionSwitchingDisabled,
            },
          );

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\/example-tb_600-r_3_2-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
        });

        it('should apply transformation when its name is based on aliases', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              aliases: {
                mdLowerHalf: '1200',
              },
              defaultTransformations: {
                mdLowerHalf: { ratio: '2:3', size: 1.0 },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 1200px\)".*srcset=".*\/example-tb_1200-r_2_3-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
        });

        it('should error when transformation name is invalid', async () => {
          // Undefined alias
          await expect(
            setup('./assets/single-image.html', {
              artDirection: {
                transformer: 'thumbor',
                defaultTransformations: {
                  lg: { ratio: '2:1', size: 1.0 },
                },
              },
              ...conversionDisabled,
              ...resolutionSwitchingDisabled,
            }),
          ).rejects.toThrow();

          // Characters problematic for a path
          await expect(
            setup('./assets/single-image.html', {
              artDirection: {
                transformer: 'thumbor',
                defaultTransformations: {
                  '%&:': { ratio: '2:1', size: 1.0 },
                },
              },
              ...conversionDisabled,
              ...resolutionSwitchingDisabled,
            }),
          ).rejects.toThrow();
        });

        it('should resolve transformation to specific image when path is provided', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              defaultTransformations: {
                '600': { path: 'custom-example.jpg' },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\/example-tb_600-p-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
        });

        it('should order transformations in ascending order', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              defaultTransformations: {
                '300': { ratio: '4:3', size: 1.0 },
                '1919': { ratio: '16:9', size: 1.0 },
                '2400': { ratio: '21:9', size: 1.0 },
                '1023': { ratio: '2:1', size: 1.0 },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 300px\)".*\/>.*<source.*media="\(max-width: 1023px\)".*<source.*media="\(max-width: 1919px\)".*\/>.*<source.*media="\(max-width: 2400px\)".*\/>.*<\/picture>/gs,
          );
        });
        it('should preserve attributes on image tag', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              defaultTransformations: {
                '600': { ratio: '4:3', size: 1.0 },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          // TODO: src will probably be in a different path
          expect(output).toMatch(
            /<picture>.*<img.*responsive.*src="\.\/example\.jpg".*class="hello".*fake-attribute.*alt="hey there".*>.*<\/picture>/gs,
          );
        });

        it('should create one source for each art-direction transformation', async () => {
          const output = await setup('./assets/single-image.html', {
            artDirection: {
              transformer: 'thumbor',
              defaultTransformations: {
                '600': { ratio: '4:3', size: 1.0 },
                '1024': { ratio: '2:1', size: 1.0 },
                '1440': { ratio: '2:3', size: 1.0 },
                '1920': { ratio: '16:9', size: 1.0 },
              },
            },
            ...conversionDisabled,
            ...resolutionSwitchingDisabled,
          });

          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\/example-tb_600-r_4_3-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 1024px\)".*srcset=".*\/example-tb_1024-r_2_1-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 1440px\)".*srcset=".*\/example-tb_1440-r_2_3-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
          expect(output).toMatch(
            /<picture>.*<source.*media="\(max-width: 1920px\)".*srcset=".*\/example-tb_1920-r_16_9-s_100.*\.jpg.*".*\/>.*<\/picture>/gs,
          );
        });
      });
    });

    describe('resolution switching enabled', () => {
      it.todo(
        'should apply breakpoints',
        // async () => {
        //   const output = await setup('./assets/single-image.html', {
        //     resolutionSwitching: {
        //       resizer: 'sharp',
        //       minViewport: 200,
        //       maxViewport: 1920,
        //       maxBreakpointsCount: 4,
        //       minSizeDifference: 35,
        //     },
        //     ...conversionDisabled,
        //   });

        //   // When supporting only one format, we should not use `<picture>` tag and only rely on `srcset`
        //   expect(output).toMatch(
        //     /<img.*srcset="\/example-b_\d*\.jpg.*\/example-b_\d*\.jpg.*".*\/>/gs,
        //   );
        // }
      );
    });
  });

  describe('multiple formats enabled', () => {
    const multipleFormatEnabled = {
      conversion: {
        converter: 'sharp' as const,
        enabledFormats: { webp: true, jpg: true },
      },
    };

    it.todo(
      'should perform conversions when a converter is specified',
      // async () => {
      //   // const output = await setup('./assets/single-image.html');
      // },
    );

    it.todo(
      'should apply transformations and breakpoints for every enabled format',
      // async () => {
      //   //
      // },
    );
    it('should order formats by efficiency (webp > jpg)', async () => {
      const output = await setup(
        './assets/single-image.html',
        multipleFormatEnabled,
      );

      expect(output).toMatch(
        /<picture>.*<source.*type="image\/webp".*srcset=".*\.webp.*".*\/>.*<source.*type="image\/jpeg".*srcset=".*\.jpg.*".*\/>.*<\/picture>/gs,
      );
    });
  });
});
