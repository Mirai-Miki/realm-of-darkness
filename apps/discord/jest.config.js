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
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^framework$": "<rootDir>/src/framework/index.ts",
    "^framework/(.*)$": "<rootDir>/src/framework/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@realm/common$": "<rootDir>/../../packages/common/src/index.ts",
    "^@realm/common/(.*)$": "<rootDir>/../../packages/common/src/$1",
    "^@realm/content$": "<rootDir>/../../packages/content/src/index.ts",
    "^@realm/content/(.*)$": "<rootDir>/../../packages/content/src/$1",
    "^@realm/core$": "<rootDir>/../../packages/core/src/index.ts",
    "^@realm/core/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "^@realm/database$": "<rootDir>/../../packages/database/src/index.ts",
    "^@realm/database/(.*)$": "<rootDir>/../../packages/database/src/$1",
    "^@realm/logger$": "<rootDir>/../../packages/logger/src/index.ts",
    "^@realm/logger/(.*)$": "<rootDir>/../../packages/logger/src/$1",
    "^@realm/repositories$":
      "<rootDir>/../../packages/repositories/src/index.ts",
    "^@realm/repositories/(.*)$":
      "<rootDir>/../../packages/repositories/src/$1",
  },
  clearMocks: true,
  restoreMocks: true,
};
