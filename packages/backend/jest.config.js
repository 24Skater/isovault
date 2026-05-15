/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/types/**', '!src/db/migrations/**'],
  coverageThreshold: { global: { lines: 80 } },
  globals: {
    'ts-jest': { tsconfig: './tsconfig.json' },
  },
  forceExit: true,
};
