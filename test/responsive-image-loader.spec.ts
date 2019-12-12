import { compiler } from './compiler';
import { ResponsiveImageLoaderConfig } from 'src/config';
import { DeepPartial } from 'ts-essentials';

async function setup(
  entryPath: string,
  options: DeepPartial<ResponsiveImageLoaderConfig> = {},
): Promise<string> {
  const stats = await compiler(entryPath, options);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return stats.toJson().modules![0].source!;
}

describe('Responsive image loader', () => {
  describe('conversion disabled', () => {
    const conversionDisabled = { conversion: { converter: undefined } };

    it.todo(
      'should not perform conversions when no converter is specified',
      async () => {
        const output = await setup('./test-assets/single-image.html');
      },
    );

    describe('art direction', () => {
      it('should not be performed when no transformer is provided', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: { transformer: undefined },
          ...conversionDisabled,
        });

        expect(output).not.toMatch(/<picture>/);
      });

      it('should not be performed when no transformations are provided', async () => {
        const output = await setup(
          './test-assets/single-image.html',
          conversionDisabled,
        );

        expect(output).not.toMatch(/<picture>/);
      });

      it('should add mime type when at least one transformation is defined', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '1200': { ratio: '2:3', size: 1.0 },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*type="image\/jpeg".*srcset=".*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });

      it('should apply transformations when defined as defaults', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '1200': { ratio: '2:3', size: 1.0 },
              '1500': { ratio: '16:9', size: 0.5 },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1500px\)".*srcset=".*\.\/example-name_1500-ratio_16_9-width_50-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1200px\)".*srcset=".*\.\/example-name_1200-ratio_2_3-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });
      it('should apply transformation when defined via inline options', async () => {
        const output = await setup(
          './test-assets/single-image-inline-config.html',
          {
            artDirection: {
              aliases: {
                xs: '600',
              },
            },
            ...conversionDisabled,
          },
        );

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\.\/example-name_xs-ratio_3_2-width_50-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });
      it('should merge inline options with default transformations when both are provided', async () => {
        const output = await setup(
          './test-assets/single-image-inline-config.html',
          {
            artDirection: {
              aliases: {
                xs: '600',
                xl: '1920',
              },
              defaultTransformations: {
                xl: { ratio: '21:9', size: 1.0 },
              },
            },
            ...conversionDisabled,
          },
        );

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1920px\)".*srcset=".*\.\/example-name_xl-ratio_21_9-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\.\/example-name_xs-ratio_3_2-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });

      it('should apply transformation when its name is based on aliases', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            aliases: {
              mdLowerHalf: '1200',
            },
            defaultTransformations: {
              mdLowerHalf: { ratio: '2:3', size: 1.0 },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1200px\)".*srcset=".*\.\/example-name_mdlowerhalf-ratio_2_3-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });

      it('should apply transformation when its name is in open interval notation', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '600': { ratio: '4:3', size: 1.0 },
              '1023': { ratio: '2:1', size: 1.0 },
              '1920': { ratio: '2:3', size: 1.0 },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1920px\)".*srcset=".*\.\/example-name_1920-ratio_2_3-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1023px\)".*srcset=".*\.\/example-name_1023-ratio_2_1-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\.\/example-name_600-ratio_4_3-width_100-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });

      it('should error when transformation name is invalid', async () => {
        // Undefined alias
        await expect(
          setup('./test-assets/single-image.html', {
            artDirection: {
              defaultTransformations: {
                lg: { ratio: '2:1', size: 1.0 },
              },
            },
            ...conversionDisabled,
          }),
        ).rejects.toThrow();

        // Characters problematic for a path
        await expect(
          setup('./test-assets/single-image.html', {
            artDirection: {
              defaultTransformations: {
                '%&:': { ratio: '2:1', size: 1.0 },
              },
            },
            ...conversionDisabled,
          }),
        ).rejects.toThrow();
      });

      it('should resolve transformation to specific image when path is provided', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '600': { path: 'example-custom.jpg' },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\.\/example-name_600-path-w_\d*\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });

      it('should order transformations in descending order', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '300': { ratio: '4:3', size: 1.0 },
              '1919': { ratio: '16:9', size: 1.0 },
              '2400': { ratio: '21:9', size: 1.0 },
              '1023': { ratio: '2:1', size: 1.0 },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 2400px\)".*\/>.*<source.*media="\(max-width: 1919px\)".*<source.*media="\(max-width: 1023px\)".*\/>.*<source.*media="\(max-width: 300px\)".*\/>.*<\/picture>/gs,
        );
      });
      it('should preserve attributes on image tag', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '600': { ratio: '4:3', size: 1.0 },
            },
          },
          ...conversionDisabled,
        });

        // TODO: src will probably be in a different path
        expect(output).toMatch(
          /<picture>.*<img.*responsive.*src="\.\/example\.jpg".*class="hello".*fake-attribute.*alt="hey there">.*<\/picture>/gs,
        );
      });
    });

    describe('resolution switching', () => {
      it('should apply breakpoints', async () => {
        const output = await setup('./test-assets/single-image.html', {
          resolutionSwitching: {
            minViewport: 200,
            maxViewport: 1920,
            maxBreakpointsCount: 4,
            minSizeDifference: 35,
          },
          ...conversionDisabled,
        });

        // When supporting only one format, we should not use `<picture>` tag and only rely on `srcset`
        expect(output).toMatch(
          /<img.*srcset="\.\/example-name_lt600-w_\d*\.jpg.*\.\/example-name_lt600-w_\d*\.jpg.*".*\/>/gs,
        );
      });
      it('should apply one breakpoint for each art-direction transformation', async () => {
        const output = await setup('./test-assets/single-image.html', {
          artDirection: {
            defaultTransformations: {
              '600': { ratio: '4:3', size: 1.0 },
              '1024': { ratio: '2:1', size: 1.0 },
              '1440': { ratio: '2:3', size: 1.0 },
              '1920': { ratio: '16:9', size: 1.0 },
            },
          },
          ...conversionDisabled,
        });

        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 600px\)".*srcset=".*\.\/example-name_600-ratio_4_3-width_100-w_600\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1024px\)".*srcset=".*\.\/example-name_1024-ratio_2_1-width_100-w_1024\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1440px\)".*srcset=".*\.\/example-name_1440-ratio_2_3-width_100-w_1440\.jpg.*".*\/>.*<\/picture>/gs,
        );
        expect(output).toMatch(
          /<picture>.*<source.*media="\(max-width: 1920px\)".*srcset=".*\.\/example-name_1920-ratio_16_9-width_100-w_1920\.jpg.*".*\/>.*<\/picture>/gs,
        );
      });
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
      async () => {
        const output = await setup('./test-assets/single-image.html');
      },
    );

    it.todo(
      'should apply transformations and breakpoints for every enabled format',
      async () => {
        //
      },
    );
    it('should order formats by efficiency (webp > jpg)', async () => {
      const output = await setup('./test-assets/single-image.html', {
        artDirection: {
          defaultTransformations: {
            '1200': { ratio: '2:3', size: 1.0 },
          },
        },
        ...multipleFormatEnabled,
      });

      expect(output).toMatch(
        /<picture>.*<source.*type="image\/webp".*media="\(max-width: 1200px\)".*srcset=".*\.webp.*".*\/>.*<source.*type="image\/jpeg".*media="\(max-width: 1200px\)".*srcset=".*\.jpg.*".*\/>.*<\/picture>/gs,
      );
    });
  });
});
