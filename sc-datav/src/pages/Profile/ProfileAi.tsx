import { useEffect, useState } from "react";
import { fetchProfile, updateAiAgent } from "@/api";
import { ApiError } from "@/api/client";
import ProfileLayout from "./ProfileLayout";
import { Card, CardTitle, Hint, Msg, SwitchButton, SwitchLabel, SwitchRow } from "./profileStyles";

export default function ProfileAi() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((profile) => setEnabled(Boolean(profile.aiAgentEnabled)))
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    setMsg(null);
    try {
      const saved = await updateAiAgent(next);
      setEnabled(saved.aiAgentEnabled);
      setMsg({
        text: saved.aiAgentEnabled ? "已启用 AI Agent" : "已关闭 AI Agent，小林回到问答模式",
        error: false,
      });
    } catch (e: unknown) {
      setMsg({ text: e instanceof ApiError ? e.message : "保存失败", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileLayout title="AI 助手" backTo="/profile">
      <Card>
        {loading && "加载中…"}
        {error && error}
        {!loading && !error && (
          <>
            <CardTitle>启用 AI Agent</CardTitle>
            {msg && <Msg $error={msg.error}>{msg.text}</Msg>}
            <Hint>
              这个开关只对你自己的账号生效，默认关闭。关闭时小林只做问答，不会查询或修改业务数据。打开后，小林可以操作系统里的库存、销售、财务、客户和用户。
            </Hint>
            <SwitchRow>
              <SwitchLabel>
                <strong>启用 AI Agent</strong>
                <span>{enabled ? "已开启" : "已关闭"}</span>
              </SwitchLabel>
              <SwitchButton
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="启用 AI Agent"
                $on={enabled}
                disabled={saving}
                onClick={() => void toggle()}
              >
                <span />
              </SwitchButton>
            </SwitchRow>
          </>
        )}
      </Card>
    </ProfileLayout>
  );
}
