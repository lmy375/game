import { defineConfig } from "vite";
import { resolve } from "node:path";

// PixiJS 2D 表现层:独立 root,复用 @core/@data 别名与 game-core 内核。
export default defineConfig({
  root: "src/platform/pixi",
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/game-core"),
      "@data": resolve(__dirname, "src/game-data"),
      "@meta": resolve(__dirname, "src/game-meta"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist-pixi"),
    emptyOutDir: true,
    target: "es2020",
  },
});
