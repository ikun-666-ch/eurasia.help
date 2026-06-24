import { Navigate } from "react-router";
import { getToken, hasPageAccess } from "@/api/client";
import type { PageKey } from "@/utils/pageAccess";

export default function RequirePageAccess({
  page,
  children,
}: {
  page: PageKey;
  children: React.ReactNode;
}) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!hasPageAccess(page)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
