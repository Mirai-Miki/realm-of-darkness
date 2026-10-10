import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  bundle: true,
  dts: false,
  sourcemap: true,
  clean: false,
  external: [
    "@realm/common",
    "discord.js",
    "@discordjs/builders",
    "@discordjs/rest",
    "source-map-support",
    "dotenv",
    "path",
    "url",
  ],
  tsconfig: "./tsconfig.build.json",
});
