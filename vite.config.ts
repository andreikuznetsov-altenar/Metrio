/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const host = process.env.TAURI_DEV_HOST;
const rootDir = join(dirname(fileURLToPath(import.meta.url)));
const appVersion = JSON.parse(
  readFileSync(join(rootDir, "package.json"), "utf8"),
).version;

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.VITE_APP_VERSION || appVersion,
    ),
    "import.meta.env.VITE_BUILD_CHANNEL": JSON.stringify(
      process.env.BUILD_CHANNEL || process.env.VITE_BUILD_CHANNEL || "development",
    ),
    "import.meta.env.VITE_GIT_COMMIT": JSON.stringify(
      process.env.VITE_GIT_COMMIT || "dev",
    ),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",
      "**/backend/**",
    ],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
