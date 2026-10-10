import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  bundle: true,
  dts: false,
  sourcemap: true,
  clean: false,
  external: ["@realm/common", "drizzle-orm", "pg", "dotenv"],
  tsconfig: "./tsconfig.build.json",
});
