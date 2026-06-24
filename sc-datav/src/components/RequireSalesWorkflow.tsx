import { Navigate } from "react-router";
import { getRoleCode, getToken, hasPageAccess } from "@/api/client";

/** 销售建单 / 待办：销售员、管理员，或已授权销售/订单页面 */
export default function RequireSalesWorkflow({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  const role = getRoleCode();
  const allowed =
    role === "ADMIN" ||
    role === "SALES" ||
    hasPageAccess("sal") ||
    hasPageAccess("orders");
  if (!allowed) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
