import { Routes, Route, Navigate } from "react-router-dom";
import LegacyAuthFlow from "./LegacyAuthFlow";

import Lobby from "./pages/Lobby";
import Spaces from "./pages/Spaces";
import AppPage from "./pages/App";

export default function App() {
  return (
    <Routes>
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/spaces" element={<Spaces />} />
      <Route path="/app/*" element={<AppPage />} />

      {/* Back-compat: old flow lives at "/" */}
      <Route path="/" element={<LegacyAuthFlow />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
