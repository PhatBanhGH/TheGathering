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
    alias: [
      { find: "events", replacement: "events" },
      {
        find: "util",
        replacement: fileURLToPath(new URL("./src/polyfills/util.ts", import.meta.url)),
      },
      { find: "stream", replacement: "stream-browserify" },
      {
        find: "globalThis",
        replacement: fileURLToPath(new URL("./src/polyfills/globalThis.ts", import.meta.url)),
      },
      { find: "buffer", replacement: "buffer" },
      {
        find: "@react-oauth/google",
        replacement: fileURLToPath(
          new URL("./src/shims/react-oauth-google.tsx", import.meta.url)
        ),
      },
    ],
  },
  optimizeDeps: {
    include: ["events", "util", "stream-browserify", "buffer"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  ssr: {
    // Đảm bảo Vite bundle/react-icons thay vì externalize để tránh lỗi default export
    noExternal: ["react-icons"],
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
