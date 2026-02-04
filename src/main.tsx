// CRITICAL: Import polyfills FIRST before any other imports
import "./polyfills/process"; // Must be first - provides process.nextTick for simple-peer
// events package is now used directly via vite.config.ts alias

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { preventDoubleTapZoom } from "./utils/helpers";
import "./index.css";
import App from "./App";

// Prevent double tap zoom on mobile
preventDoubleTapZoom();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
