import { defineConfig } from "vite";
import { resolve } from "node:path";

// 唯一表现层：PixiJS 2D。（旧 web/three 表现层已下线。）
export default defineConfig({
  root: "src/platform/pixi",
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
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
  },
});
