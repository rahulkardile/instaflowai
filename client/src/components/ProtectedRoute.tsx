import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface User {
  isLogin: boolean;
  token?: string;
}

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const user = localStorage.getItem("user");

  let isAuthenticated: User | null = null;

  try {
    isAuthenticated = user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Invalid user data in localStorage", error);
  }

  if (!isAuthenticated?.isLogin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;