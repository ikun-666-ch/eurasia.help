import { Navigate, Route, Routes } from "react-router";
import ProfileInfo from "./ProfileInfo";
import ProfileLogout from "./ProfileLogout";
import ProfileMenu from "./ProfileMenu";
import ProfilePassword from "./ProfilePassword";
import ProfilePhone from "./ProfilePhone";

export default function ProfileRoutes() {
  return (
    <Routes>
      <Route index element={<ProfileMenu />} />
      <Route path="info" element={<ProfileInfo />} />
      <Route path="password" element={<ProfilePassword />} />
      <Route path="phone" element={<ProfilePhone />} />
      <Route path="logout" element={<ProfileLogout />} />
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
}
