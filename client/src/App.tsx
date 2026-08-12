import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { auth } from "./utils/auth";

// Lazy-loaded page components for optimal code splitting & performance
const Landing      = lazy(() => import("./pages/Landing"));
const Login        = lazy(() => import("./pages/Login"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Reels        = lazy(() => import("./pages/Reels"));
const PrivacyPolicy= lazy(() => import("./pages/PrivacyPolicy"));
const AdminPanel   = lazy(() => import("./pages/AdminPanel"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafb] dark:bg-[#09090b]">
      <div className="flex flex-col items-center gap-3">
        <img
          src="/instaFlow-icon.png"
          alt="InstaFlow Logo"
          className="h-10 w-10 rounded-[12px] object-cover shadow-md animate-pulse"
        />
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#71717a] dark:text-[#a1a1aa]">
          <Loader2 size={16} className="animate-spin text-[#7c3aed]" />
          Loading InstaFlow…
        </div>
      </div>
    </div>
  );
}

/** Route that only renders for admin-role users */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const session = auth.get();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/"                element={<Landing />} />
        <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reels"
          element={
            <ProtectedRoute>
              <Reels />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}