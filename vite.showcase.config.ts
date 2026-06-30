import { defineConfig } from "vite";
import { resolve } from "node:path";

// 表现层对比页:单服务同时提供外壳页(src/platform/index.html)与 web/three/pixi 三套子应用。
export default defineConfig({
  root: "src/platform",
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/game-core"),
      "@data": resolve(__dirname, "src/game-data"),
      "@meta": resolve(__dirname, "src/game-meta"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist-showcase"),
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/platform/index.html"),
        web: resolve(__dirname, "src/platform/web/index.html"),
        three: resolve(__dirname, "src/platform/three/index.html"),
        pixi: resolve(__dirname, "src/platform/pixi/index.html"),
      },
    },
  },
});
