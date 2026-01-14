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
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }
            if (id.includes("phaser")) {
              return "vendor-phaser";
            }
            if (id.includes("socket.io-client")) {
              return "vendor-socket";
            }
            if (id.includes("simple-peer")) {
              return "vendor-webrtc";
            }
            // Other node_modules
            return "vendor-other";
          }
          
          // Page chunks for better code splitting
          if (id.includes("/pages/")) {
            if (id.includes("ChatPage")) {
              return "page-chat";
            }
            if (id.includes("CalendarPage")) {
              return "page-calendar";
            }
            if (id.includes("App.tsx")) {
              return "page-app";
            }
          }
          
          // Component chunks
          if (id.includes("/components/")) {
            if (id.includes("GameScene") || id.includes("/game/")) {
              return "chunk-game";
            }
            if (id.includes("/chat/")) {
              return "chunk-chat";
            }
            if (id.includes("/modals/")) {
              return "chunk-modals";
            }
          }
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()?.replace(".tsx", "").replace(".ts", "")
            : "chunk";
          return `assets/${facadeModuleId}-[hash].js`;
        },
      },
    },
    // Enable minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, // Keep console in dev, remove in production
        drop_debugger: true,
      },
    },
  },
  define: {
    global: "globalThis",
    "process.env": "{}",
    // Note: process.nextTick is polyfilled in main.tsx, not here
    "process.browser": "true",
  },
  resolve: {
    alias: {
      events: "events", // Use events package directly instead of custom polyfill
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
