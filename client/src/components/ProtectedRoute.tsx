import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../utils/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
  const session = auth.get();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && session.user?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;