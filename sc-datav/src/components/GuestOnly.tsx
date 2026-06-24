import { Navigate } from "react-router";
import { getToken } from "@/api/client";

export default function GuestOnly({ children }: { children: React.ReactNode }) {
  if (getToken()) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
