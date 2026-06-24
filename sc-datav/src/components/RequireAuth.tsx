import { Navigate, useLocation } from "react-router";
import { getToken } from "@/api/client";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
