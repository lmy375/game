import { defineConfig } from "vite";
import { resolve } from "node:path";

// Three.js is the default; --mode pixi preserves the original 2D renderer.
export default defineConfig(({ mode }) => ({
  root: mode === "pixi" ? "src/platform/pixi" : "src/platform/three",
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/game-core"),
      "@data": resolve(__dirname, "src/game-data"),
      "@meta": resolve(__dirname, "src/game-meta"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    root: resolve(__dirname),
  },
  build: {
    outDir: resolve(__dirname, mode === "pixi" ? "dist-pixi" : "dist"),
    emptyOutDir: true,
    target: "es2020",
  },
}));
