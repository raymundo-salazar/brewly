import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'scripts/**/*.ts',
    'bin/**/*.ts',
    '!src/main/**',
    '!bin/brewly/**',
    '!scripts/installLaunchAgent/**',
    '!scripts/manageLaunchAgent/**',
    '!scripts/managePower/**',
    '!scripts/migrate/**',
    '!scripts/viewLogs/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'text-summary', 'html', 'json', 'cobertura'],
  reporters: ['default', 'jest-junit'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
};

export default config;
