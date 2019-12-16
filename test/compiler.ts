import MemoryFileSystem from 'memory-fs';
import { resolve } from 'path';
import webpack from 'webpack';
import { DeepPartial } from 'ts-essentials';
import { ResponsiveImageLoaderConfig } from 'src/config';

export async function compiler(
  entryPath: string,
  options: DeepPartial<ResponsiveImageLoaderConfig> = {},
): Promise<webpack.Stats> {
  const compiler = webpack({
    context: __dirname,
    entry: entryPath,
    output: {
      path: resolve(__dirname),
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          // Remember loaders are applied in reverse order
          use: [
            // Transforms into a JS module returning the raw generated string
            'raw-loader',
            // Our loader
            {
              loader: resolve(__dirname, '../src/responsive-image-loader.ts'),
              options,
            },
          ],
        },
      ],
    },
  });

  compiler.outputFileSystem = new MemoryFileSystem();

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err);
      if (stats.hasErrors())
        reject(new Error(stats.toJson().errors.join(' // ')));

      resolve(stats);
    });
  });
}
