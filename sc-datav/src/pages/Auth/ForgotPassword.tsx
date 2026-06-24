import { useEffect, useState } from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router";
import { resetForgotPassword, sendForgotPasswordCode } from "@/api";
import { ApiError } from "@/api/client";
import {
  PuzzleCaptchaModal,
  useSliderCaptchaGate,
} from "@/components/PuzzleCaptchaModal";
import {
  BtnGroup,
  BtnPrimary,
  BtnSendCode,
  BtnText,
  CodeRow,
  ErrorMsg,
  Fields,
  Form,
  FormInner,
  Header,
  Input,
  InputGroup,
  InputWrapper,
  Icon,
  Label,
  Page,
  CodeInput,
  Subtitle,
  Title,
} from "./authStyles";
import { CodeIcon, LockIcon, PhoneIcon } from "./icons";

const MOBILE_RE = /^1\d{10}$/;

const SuccessMsg = styled(ErrorMsg)`
  color: #2e7d32;
  background: #e8f5e9;
  border-left-color: #66bb6a;
`;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const captcha = useSliderCaptchaGate();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendCode = async (phone: string, captchaToken: string) => {
    setSending(true);
    try {
      await sendForgotPasswordCode(phone, captchaToken);
      setCountdown(60);
      setSuccess("验证码已发送");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "验证码发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleSendCode = () => {
    setError(null);
    setSuccess(null);
    const phone = mobile.trim();
    if (!MOBILE_RE.test(phone)) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    captcha.request((captchaToken) => sendCode(phone, captchaToken));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const phone = mobile.trim();
    if (!MOBILE_RE.test(phone)) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    if (!code.trim()) {
      setError("请输入短信验证码");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await resetForgotPassword({
        mobile: phone,
        code: code.trim(),
        password,
      });
      navigate("/login", {
        replace: true,
        state: { message: "密码已重置，请使用新密码登录" },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "重置失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <PuzzleCaptchaModal
        open={captcha.open}
        onClose={captcha.handleClose}
        onSuccess={captcha.handleSuccess}
      />
      <Form onSubmit={handleSubmit}>
        <FormInner>
          <Header>
            <Title>忘记密码</Title>
            <Subtitle>使用已注册手机号 + 短信验证码重置密码</Subtitle>
          </Header>

          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}

          <Fields>
            <InputWrapper>
              <Label htmlFor="mobile">手机号</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <PhoneIcon />
                </Icon>
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="已绑定的 11 位手机号"
                  autoComplete="tel"
                  required
                />
              </InputGroup>
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="code">验证码</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <CodeIcon />
                </Icon>
                <CodeRow>
                  <CodeInput
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="短信验证码"
                    required
                  />
                  <BtnSendCode
                    type="button"
                    disabled={sending || countdown > 0}
                    onClick={handleSendCode}>
                    {countdown > 0 ? `${countdown}s` : sending ? "发送中…" : "获取验证码"}
                  </BtnSendCode>
                </CodeRow>
              </InputGroup>
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="password">新密码</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <LockIcon />
                </Icon>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  required
                />
              </InputGroup>
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <LockIcon />
                </Icon>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  required
                />
              </InputGroup>
            </InputWrapper>
          </Fields>

          <BtnGroup>
            <BtnPrimary type="submit" disabled={loading}>
              {loading ? "提交中…" : "重置密码"}
            </BtnPrimary>
            <BtnText type="button" as={Link} to="/login">
              返回登录
            </BtnText>
          </BtnGroup>
        </FormInner>
      </Form>
    </Page>
  );
}
