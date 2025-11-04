const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/**/*.d.ts',
  ],
};

module.exports = createJestConfig(customJestConfig);