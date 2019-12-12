/* eslint-env node */
const esModules = ['lodash-es'].join('|');

module.exports = {
  globals: {
    __DEV__: true,
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  // noStackTrace: true,
  // bail: true,
  // cache: false,
  // verbose: true,
  // watch: true,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/test/coverage',
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageThreshold: {
    global: {
      //  branches: 50,
      //  functions: 50,
      //  lines: 50,
      //  statements: 50
    },
  },
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/src/**/*.jest.spec.ts'],
  moduleFileExtensions: ['json', 'ts'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    // TODO: temporary fix for lodash imports, while we search a way to manage not transpiled ES Modules
    // See https://github.com/quasarframework/quasar-testing/issues/48#issuecomment-507763139
    // '^lodash-es$': 'lodash',
  },
  transform: {
    // Jest fire off an error when JS file are not already compiled (lodash-es in our case)
    // We use babel-jest to compile them
    // See https://github.com/nrwl/nx/issues/812#issuecomment-429488470
    // See https://jestjs.io/docs/en/configuration.html#transformignorepatterns-array-string
    [`^(${esModules}).+\\.js$`]: 'babel-jest',
    '^.+\\.(ts|js|html)$': 'ts-jest',
  },
  transformIgnorePatterns: [`<rootDir>/node_modules/(?!(${esModules}))`],
};
