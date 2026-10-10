import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  bundle: true,
  dts: false,
  sourcemap: true,
  clean: false,
  external: ["zod"],
  tsconfig: "./tsconfig.build.json",
});
