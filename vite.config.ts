import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import inject from "@rollup/plugin-inject";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    inject({
      global: ["globalThis", "global"],
      process: fileURLToPath(
        new URL("./src/polyfills/process.ts", import.meta.url)
      ),
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  define: {
    global: "globalThis",
    "process.browser": "true",
  },
  resolve: {
    alias: {
      events: "events",
      util: fileURLToPath(new URL("./src/polyfills/util.ts", import.meta.url)),
      stream: "stream-browserify",
      globalThis: fileURLToPath(
        new URL("./src/polyfills/globalThis.ts", import.meta.url)
      ),
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["events", "util", "stream-browserify", "buffer"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5001",
        ws: true,
      },
    },
  },
});
