
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
      // Exclude HTML files from injection
      include: ["**/*.js", "**/*.ts", "**/*.tsx", "**/*.jsx"],
      exclude: ["**/*.html"],
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
    // Ensure Rollup's CommonJS handling sees pnpm's nested node_modules
    commonjsOptions: {
      include: [/node_modules/, /node_modules\/\.pnpm/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Module polyfill banner removed - SFU only, no simple-peer needed
    },
  },
  define: {
    global: "globalThis",
    "process.browser": "true",
  },
  resolve: {
    // Đảm bảo Vite/Rollup chỉ dùng một bản React duy nhất
    dedupe: ["react", "react-dom"],
    // Node polyfills removed - SFU (mediasoup) only, no simple-peer needed
    alias: [
      {
        find: "globalThis",
        replacement: fileURLToPath(new URL("./src/polyfills/globalThis.ts", import.meta.url)),
      },
      // @react-oauth/google alias removed - use real package for Google OAuth
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
    include: ["react", "react-dom"],
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
