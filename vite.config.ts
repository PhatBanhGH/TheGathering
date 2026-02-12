
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import inject from "@rollup/plugin-inject";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Dùng automatic JSX runtime (React 17+)
    react(),
    tailwindcss(),
    inject({
      global: ["globalThis", "global"],
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
    // Ensure Rollup's CommonJS handling sees pnpm's nested node_modules
    commonjsOptions: {
      include: [/node_modules/, /node_modules\/\.pnpm/, /simple-peer/],
      transformMixedEsModules: true,
    },
  },
  define: {
    global: "globalThis",
    "process.browser": "true",
  },
  resolve: {
    // Đảm bảo Vite/Rollup chỉ dùng một bản React duy nhất
    dedupe: ["react", "react-dom"],
    // Forced CJS resolution removed to fix @emotion/is-prop-valid
    alias: [

      {
        find: "util",
        replacement: fileURLToPath(new URL("./src/polyfills/util.ts", import.meta.url)),
      },
      {
        find: "events",
        replacement: fileURLToPath(new URL("./src/polyfills/events.js", import.meta.url)),
      },
      {
        find: "stream",
        replacement: fileURLToPath(new URL("./src/polyfills/stream.js", import.meta.url)),
      },
      {
        find: /stream-browserify/,
        replacement: fileURLToPath(new URL("./src/polyfills/stream.js", import.meta.url)),
      },
      {
        find: "string_decoder",
        replacement: fileURLToPath(new URL("./src/polyfills/string_decoder.js", import.meta.url)),
      },
      {
        find: "inherits",
        replacement: fileURLToPath(new URL("./src/polyfills/inherits.js", import.meta.url)),
      },
      {
        find: "util",
        replacement: fileURLToPath(new URL("./src/polyfills/util.js", import.meta.url)),
      },
      {
        find: "util-deprecate",
        replacement: fileURLToPath(new URL("./src/polyfills/util_deprecate.js", import.meta.url)),
      },
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
      {
        find: "react-icons/fa",
        replacement: fileURLToPath(
          new URL("./src/shims/react-icons-fa.tsx", import.meta.url)
        ),
      },
      {
        find: "react-icons/fc",
        replacement: fileURLToPath(
          new URL("./src/shims/react-icons-fc.tsx", import.meta.url)
        ),
      },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "events", "util", "buffer", "string_decoder", "safe-buffer", "simple-peer"],
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
