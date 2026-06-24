import { useState } from "react";
import { changePassword } from "@/api";
import { ApiError } from "@/api/client";
import ProfileLayout from "./ProfileLayout";
import { BtnPrimary, Card, CardTitle, Field, Msg, TextLink } from "./profileStyles";

export default function ProfilePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 6) {
      setMsg({ text: "新密码至少 6 位", error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: "两次输入的新密码不一致", error: true });
      return;
    }
    setSaving(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setMsg({ text: "密码修改成功", error: false });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMsg({
        text: err instanceof ApiError ? err.message : "修改失败",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileLayout title="修改密码" backTo="/profile">
      <Card>
        <CardTitle>设置新密码</CardTitle>
        {msg && <Msg $error={msg.error}>{msg.text}</Msg>}
        <form onSubmit={(e) => void handleSubmit(e)}>
          <Field>
            原密码
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            新密码
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field>
            确认新密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <BtnPrimary type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存密码"}
          </BtnPrimary>
        </form>
        <TextLink to="/forgot-password">忘记原密码？</TextLink>
      </Card>
    </ProfileLayout>
  );
}
