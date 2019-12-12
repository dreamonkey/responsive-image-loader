import memoryfs from 'memory-fs';
import path from 'path';
import webpack from 'webpack';

export async function compiler(
  entryPath: string,
  options = {}
): Promise<webpack.Stats> {
  const compiler = webpack({
    context: __dirname,
    entry: `./${entryPath}`,
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          use: {
            loader: path.resolve(__dirname, './responsive-image-loader.ts'),
            options
          }
        }
      ]
    }
  });

  compiler.outputFileSystem = new memoryfs();

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err);
      if (stats.hasErrors())
        reject(new Error(stats.toJson().errors.join(' // ')));

      resolve(stats);
    });
  });
}
