/** @type {import('jest').Config} */
export default {
  // Use ts-jest preset for TypeScript support
  preset: "ts-jest",

  // Set test environment to Node.js
  testEnvironment: "node",

  // Module file extensions Jest should recognize
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Directories to search for modules
  moduleDirectories: ["node_modules", "src"],

  // Transform TypeScript files using @swc/jest
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },

  // Test file patterns
  testMatch: [
    "**/test/**/*.test.(ts|tsx|js)",
    "**/test/**/*.spec.(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)",
  ],

  // Ignore setup files when looking for tests
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/setup.ts"],

  // Transform @realm packages
  transformIgnorePatterns: ["node_modules/(?!(@realm)/)"],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/index.ts",
  ],

  // Coverage thresholds (optional)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup files (if needed)
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],

  // Module name mapping for path aliases and extension resolution
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Map workspace packages to their TypeScript source (fixes ESM import issues)
    "^@realm/common$": "<rootDir>/../common/src/index.ts",
    "^@realm/common/(.*)$": "<rootDir>/../common/src/$1",
    "^@realm/errors$": "<rootDir>/../errors/src/index.ts",
    "^@realm/logger$": "<rootDir>/../logger/src/index.ts",
  },

  // Clear mocks automatically between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
};
