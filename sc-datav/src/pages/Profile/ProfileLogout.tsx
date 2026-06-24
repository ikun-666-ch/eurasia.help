import { useNavigate } from "react-router";
import { authLogout } from "@/api";
import ProfileLayout from "./ProfileLayout";
import { BtnDanger, BtnGhost, Card, Hint } from "./profileStyles";

export default function ProfileLogout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authLogout();
    navigate("/login", { replace: true });
  };

  return (
    <ProfileLayout title="退出登录" backTo="/profile">
      <Card>
        <Hint>退出后将清除本机登录状态，需要重新登录才能访问系统。</Hint>
        <BtnDanger type="button" onClick={() => void handleLogout()}>
          确认退出登录
        </BtnDanger>
        <BtnGhost type="button" onClick={() => navigate("/profile")}>
          取消
        </BtnGhost>
      </Card>
    </ProfileLayout>
  );
}
