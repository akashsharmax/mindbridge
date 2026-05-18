/**
 * App.jsx — Root Component & Router
 *
 * Sets up:
 * 1. Context providers (Auth → Socket → Toast)
 * 2. Route definitions with protected route wrapper
 * 3. Global crisis modal overlay (always rendered when crisis active)
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import CrisisModal from "./components/Crisis/CrisisModal";
import { useSocket } from "./context/SocketContext";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import JournalPage from "./pages/JournalPage";
import JournalDetailPage from "./pages/JournalDetailPage";
import ChatPage from "./pages/ChatPage";
import MoodPage from "./pages/MoodPage";
import InsightsPage from "./pages/InsightsPage";
import ProfilePage from "./pages/ProfilePage";
import AppLayout from "./components/Layout/AppLayout";

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex gap-2">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth/login" replace />;
};

// Crisis modal wrapper (needs socket context)
const GlobalCrisisModal = () => {
  const { crisisAlert, dismissCrisis } = useSocket();
  if (!crisisAlert) return null;
  return <CrisisModal severity={crisisAlert.severity} onDismiss={dismissCrisis} />;
};

// Inner app (inside AuthProvider so it can use useAuth)
const AppInner = () => {
  return (
    <SocketProvider>
      <GlobalCrisisModal />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1c1e30",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontFamily: "'DM Sans', sans-serif",
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        {/* Protected routes — wrapped in AppLayout (sidebar + navbar) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="journal/:id" element={<JournalDetailPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="mood" element={<MoodPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SocketProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
