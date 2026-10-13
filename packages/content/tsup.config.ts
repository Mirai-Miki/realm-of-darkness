import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  shims: true,
  bundle: true,
  noExternal: ["yaml"],
  banner: {
    js: "import { createRequire as __contentCreateRequire } from 'module'; const require = __contentCreateRequire(import.meta.url);",
  },
  dts: false,
  sourcemap: true,
  clean: false,
  tsconfig: "./tsconfig.build.json",
});
