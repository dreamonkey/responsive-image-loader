const bgImageHandlerPath = './dist/src/background-image-handler';

const resolve = require('path').resolve;
const handlerFnName = require(bgImageHandlerPath).default.name;

module.exports = {
  mode: 'production',
  entry: bgImageHandlerPath,
  output: {
    path: resolve(__dirname, 'dist/src'),
    library: handlerFnName,
    libraryExport: 'default',
    libraryTarget: 'window',
  },
};
