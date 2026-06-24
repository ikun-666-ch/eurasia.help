import { useEffect, useState } from "react";
import { changePhone, sendChangePhoneCode } from "@/api";
import { ApiError } from "@/api/client";
import {
  PuzzleCaptchaModal,
  useSliderCaptchaGate,
} from "@/components/PuzzleCaptchaModal";
import ProfileLayout from "./ProfileLayout";
import {
  BtnPrimary,
  BtnSendCode,
  Card,
  CardTitle,
  CodeRow,
  Field,
  Msg,
} from "./profileStyles";

const MOBILE_RE = /^1\d{10}$/;

export default function ProfilePhone() {
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const captcha = useSliderCaptchaGate();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendCode = async (mobile: string, captchaToken: string) => {
    setSendingCode(true);
    try {
      await sendChangePhoneCode(mobile, captchaToken);
      setCountdown(60);
      setMsg({ text: "验证码已发送", error: false });
    } catch (err) {
      setMsg({
        text: err instanceof ApiError ? err.message : "发送失败",
        error: true,
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleSendCode = () => {
    setMsg(null);
    const mobile = newPhone.trim();
    if (!MOBILE_RE.test(mobile)) {
      setMsg({ text: "请输入正确的 11 位手机号", error: true });
      return;
    }
    captcha.request((captchaToken) => sendCode(mobile, captchaToken));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const mobile = newPhone.trim();
    if (!MOBILE_RE.test(mobile)) {
      setMsg({ text: "请输入正确的 11 位手机号", error: true });
      return;
    }
    if (!phoneCode.trim()) {
      setMsg({ text: "请输入验证码", error: true });
      return;
    }
    if (!password) {
      setMsg({ text: "请输入登录密码", error: true });
      return;
    }
    setSaving(true);
    try {
      await changePhone({ mobile, code: phoneCode.trim(), password });
      setMsg({ text: "手机号已更新", error: false });
      setNewPhone("");
      setPhoneCode("");
      setPassword("");
    } catch (err) {
      setMsg({
        text: err instanceof ApiError ? err.message : "更新失败",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileLayout title="修改手机号" backTo="/profile">
      <PuzzleCaptchaModal
        open={captcha.open}
        onClose={captcha.handleClose}
        onSuccess={captcha.handleSuccess}
      />
      <Card>
        <CardTitle>绑定新手机号</CardTitle>
        {msg && <Msg $error={msg.error}>{msg.text}</Msg>}
        <form onSubmit={(e) => void handleSubmit(e)}>
          <Field>
            登录密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="验证身份"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            新手机号
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="11 位手机号"
              required
            />
          </Field>
          <Field>
            验证码
            <CodeRow>
              <input
                inputMode="numeric"
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                placeholder="短信验证码"
                required
              />
              <BtnSendCode
                type="button"
                disabled={sendingCode || countdown > 0}
                onClick={handleSendCode}>
                {countdown > 0 ? `${countdown}s` : sendingCode ? "发送中…" : "获取验证码"}
              </BtnSendCode>
            </CodeRow>
          </Field>
          <BtnPrimary type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存手机号"}
          </BtnPrimary>
        </form>
      </Card>
    </ProfileLayout>
  );
}
