import { Navigate } from "react-router";
import { getRoleCode, getToken, hasPageAccess } from "@/api/client";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (getRoleCode() !== "ADMIN" || !hasPageAccess("admin")) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
