/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleDirectories: ["node_modules", "src"],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  testMatch: [
    "**/test/**/*.test.(ts|tsx|js)",
    "**/test/**/*.spec.(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/setup.ts"],
  transformIgnorePatterns: ["node_modules/(?!(@realm)/)"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/index.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@realm/common$": "<rootDir>/../common/src/index.ts",
    "^@realm/common/(.*)$": "<rootDir>/../common/src/$1",
  },

  clearMocks: true,
  restoreMocks: true,
};
