import ProfileLayout from "./ProfileLayout";
import { MenuBtn, MenuList } from "./profileStyles";

export default function ProfileMenu() {
  return (
    <ProfileLayout title="个人中心" backTo="/home">
      <MenuList>
        <MenuBtn to="/profile/info">
          <span>账号信息</span>
          <span>›</span>
        </MenuBtn>
        <MenuBtn to="/profile/password">
          <span>修改密码</span>
          <span>›</span>
        </MenuBtn>
        <MenuBtn to="/profile/phone">
          <span>修改手机号</span>
          <span>›</span>
        </MenuBtn>
        <MenuBtn to="/profile/logout" $danger>
          <span>退出登录</span>
          <span>›</span>
        </MenuBtn>
      </MenuList>
    </ProfileLayout>
  );
}
