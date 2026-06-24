import { useEffect, useState } from "react";
import { fetchProfile, updateProfile } from "@/api";
import type { UserProfile } from "@/api/types";
import { ApiError } from "@/api/client";
import ProfileLayout from "./ProfileLayout";
import {
  BtnPrimary,
  Card,
  CardTitle,
  Field,
  InfoRow,
  Msg,
} from "./profileStyles";

export default function ProfileInfo() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        setProfile(data);
        setUsername(data.username);
        setDisplayName(data.displayName);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "加载失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setMsg(null);

    const nextUsername = username.trim();
    const nextDisplayName = displayName.trim();
    if (nextUsername.length < 3) {
      setMsg({ text: "用户名至少 3 个字符", error: true });
      return;
    }
    if (nextDisplayName === "") {
      setMsg({ text: "请填写姓名", error: true });
      return;
    }
    if (
      nextUsername === profile.username &&
      nextDisplayName === profile.displayName
    ) {
      setMsg({ text: "没有修改内容", error: true });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        username: nextUsername,
        displayName: nextDisplayName,
      });
      setProfile(updated);
      setUsername(updated.username);
      setDisplayName(updated.displayName);
      setMsg({ text: "资料已保存", error: false });
    } catch (err) {
      setMsg({
        text: err instanceof ApiError ? err.message : "保存失败",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileLayout title="账号信息" backTo="/profile">
      <Card>
        {loading && "加载中…"}
        {error && error}
        {!loading && !error && profile && (
          <>
            <CardTitle>基本信息</CardTitle>
            {msg && <Msg $error={msg.error}>{msg.text}</Msg>}
            <form onSubmit={(e) => void handleSubmit(e)}>
              <Field>
                用户名
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </Field>
              <Field>
                姓名
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
              <InfoRow>
                <span>角色</span>
                <span>{profile.roleName}</span>
              </InfoRow>
              <InfoRow>
                <span>手机号</span>
                <span>{profile.phoneMasked || profile.phone || "未绑定"}</span>
              </InfoRow>
              <BtnPrimary type="submit" disabled={saving}>
                {saving ? "保存中…" : "保存资料"}
              </BtnPrimary>
            </form>
          </>
        )}
      </Card>
    </ProfileLayout>
  );
}
