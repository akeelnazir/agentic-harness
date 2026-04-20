module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'esbuild-jest',
  },
  moduleNameMapper: {
    '^(.*)\\.ts$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'],
};