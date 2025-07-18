import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { JSX } from "react";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
