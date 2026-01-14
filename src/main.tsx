// CRITICAL: Import polyfills FIRST before any other imports
import "./polyfills/process"; // Must be first - provides process.nextTick for simple-peer
// events package is now used directly via vite.config.ts alias

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./styles/discord-tokens.css"; // Discord-like design tokens
import { preventDoubleTapZoom } from "./utils/helpers";

// Prevent double tap zoom on mobile
preventDoubleTapZoom();
import Homepage from "./pages/Homepage.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Lobby from "./pages/Lobby.tsx";
import Spaces from "./pages/Spaces.tsx";
import AppPage from "./pages/App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/spaces" element={<Spaces />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/app/chat" element={<AppPage />} />
        <Route path="/app/profile/:userId" element={<AppPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
