import { Routes, Route, Navigate } from "react-router-dom";
import LegacyAuthFlow from "./LegacyAuthFlow";

import Lobby from "./pages/Lobby";
import AppPage from "./pages/App";
import Library from "./pages/Library";
import AvatarPage from "./pages/AvatarPage";
import Spaces from "./pages/Spaces";
import SetupPage from "./pages/SetupPage";
import PortalDashboard from "./portal/dashboard/PortalDashboard";
import AdminDashboard from "./portal/admin/AdminDashboard";
import RequireAuth from "./portal/routing/RequireAuth";
import RequireAdmin from "./portal/routing/RequireAdmin";

export default function App() {
  return (
    <Routes>
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/spaces" element={<Spaces />} />
      <Route path="/setup/:roomId" element={<SetupPage />} />
      <Route path="/app/chat" element={<AppPage />} />
      {/* Updated app route to accept roomId */}
      <Route path="/app/:roomId" element={<AppPage />} />
      <Route path="/app" element={<Navigate to="/spaces" replace />} />

      <Route path="/avatar" element={<AvatarPage />} />

      <Route
        path="/library"
        element={
          <RequireAuth>
            <Library />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <PortalDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      {/* Back-compat: old flow lives at "/" */}
      <Route path="/" element={<LegacyAuthFlow />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
