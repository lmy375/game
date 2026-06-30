import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "src/platform/web",
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
