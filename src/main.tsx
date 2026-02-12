// CRITICAL: Import polyfills FIRST before any other imports
import "./polyfills/module"; // Must be first - provides global.module for CJS libs
import "./polyfills/process"; // Must be second - provides process.nextTick for simple-peer
// events package is now used directly via vite.config.ts alias

// console.log moved down

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
// import "./userWorker"; // Tắt worker tạm thời để debug
import { preventDoubleTapZoom } from "./utils/helpers";
import { ToastProvider } from "./contexts/ToastContext";

console.log("Main.tsx: Starting execution");
console.log("Main.tsx: Imports done");
console.log("Main.tsx: Imports done");

// Prevent double tap zoom on mobile
preventDoubleTapZoom();

const rootElement = document.getElementById("root");
console.log("Main.tsx: Root element found:", rootElement);

if (rootElement) {
  console.log("Main.tsx: Creating root");
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
        {/* <div style={{ color: 'red', fontSize: '24px' }}>DEBUG MODE</div> */}
      </React.StrictMode>
    );
    console.log("Main.tsx: Render called");
  } catch (e) {
    console.error("Main.tsx: Render crashed", e);
  }
} else {
  console.error("Main.tsx: No root element");
}

