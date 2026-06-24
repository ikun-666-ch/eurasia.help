import { useEffect, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "react-router";
import { login, loginSms, sendSmsCode } from "@/api";
import { ApiError } from "@/api/client";
import {
  BtnGroup,
  BtnPrimary,
  BtnSendCode,
  BtnText,
  CodeInput,
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
  Subtitle,
  Title,
} from "./authStyles";
import { LockIcon, UserIcon } from "./icons";

const SuccessMsg = styled(ErrorMsg)`
  color: #2e7d32;
  background: #e8f5e9;
  border-left-color: #66bb6a;
`;

const AuthLinks = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
`;

const TabRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: var(--space-l);
  flex-wrap: wrap;
`;

const TabBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  min-width: 90px;
  padding: 8px 10px;
  border-radius: var(--base-border-radius);
  border: 2px solid
    ${({ $active }) => ($active ? "var(--color-primary)" : "#ccc")};
  background: ${({ $active }) => ($active ? "var(--color-primary)" : "white")};
  color: ${({ $active }) => ($active ? "white" : "var(--color-secondary)")};
  font-size: calc(var(--font-size) / 1.8);
  cursor: pointer;
`;

const Hint = styled.p`
  margin: 0 0 var(--space-m);
  font-size: calc(var(--font-size) / 1.6);
  color: #666;
  line-height: 1.4;
`;

type LoginMode = "password" | "sms";

function useSendCooldown(seconds = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [left]);
  return {
    cooling: left > 0,
    label: left > 0 ? `${left}s` : "获取验证码",
    start: () => setLeft(seconds),
  };
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string; message?: string } | null)?.from ?? "/home";
  const flashMessage =
    (location.state as { message?: string } | null)?.message ?? null;

  const [mode, setMode] = useState<LoginMode>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const smsCooldown = useSendCooldown();

  useEffect(() => {
    localStorage.removeItem("nursery_token");
    localStorage.removeItem("nursery_role");
    localStorage.removeItem("nursery_pages");
  }, []);

  const finishLogin = () => navigate(redirectTo, { replace: true });

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("请填写用户名和密码");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      finishLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSendSms = async () => {
    setError(null);
    const m = mobile.replace(/\D/g, "");
    if (m.length !== 11) {
      setError("请输入 11 位手机号");
      return;
    }
    try {
      await sendSmsCode(m);
      smsCooldown.start();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "发送失败");
    }
  };

  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const m = mobile.replace(/\D/g, "");
    if (m.length !== 11 || !smsCode.trim()) {
      setError("请填写手机号和验证码");
      return;
    }
    setLoading(true);
    try {
      await loginSms(m, smsCode.trim());
      finishLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = mode === "password" ? handlePassword : handleSmsLogin;

  return (
    <Page>
      <Form onSubmit={onSubmit}>
        <FormInner>
          <Header>
            <Title>用户登录</Title>
            <Subtitle>支持密码登录或短信验证码登录</Subtitle>
          </Header>

          <TabRow>
            <TabBtn
              type="button"
              $active={mode === "password"}
              onClick={() => {
                setMode("password");
                setError(null);
              }}>
              密码登录
            </TabBtn>
            <TabBtn
              type="button"
              $active={mode === "sms"}
              onClick={() => {
                setMode("sms");
                setError(null);
              }}>
              短信登录
            </TabBtn>
          </TabRow>

          {flashMessage && <SuccessMsg>{flashMessage}</SuccessMsg>}
          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Fields>
            {mode === "password" && (
              <>
                <InputWrapper>
                  <Label htmlFor="username">账号</Label>
                  <InputGroup>
                    <Icon className="auth-icon">
                      <UserIcon />
                    </Icon>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="用户名或手机号"
                      autoComplete="username"
                    />
                  </InputGroup>
                </InputWrapper>
                <InputWrapper>
                  <Label htmlFor="password">密码</Label>
                  <InputGroup>
                    <Icon className="auth-icon">
                      <LockIcon />
                    </Icon>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="密码"
                      autoComplete="current-password"
                    />
                  </InputGroup>
                </InputWrapper>
              </>
            )}

            {mode === "sms" && (
              <>
                <Hint>使用已在系统白名单内的手机号接收验证码登录。</Hint>
                <InputWrapper>
                  <Label htmlFor="mobile">手机号</Label>
                  <InputGroup>
                    <Icon className="auth-icon">
                      <UserIcon />
                    </Icon>
                    <Input
                      id="mobile"
                      inputMode="numeric"
                      maxLength={11}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="11 位手机号"
                    />
                  </InputGroup>
                </InputWrapper>
                <InputWrapper>
                  <Label htmlFor="smsCode">验证码</Label>
                  <InputGroup>
                    <CodeRow>
                      <CodeInput
                        id="smsCode"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="短信验证码"
                        maxLength={6}
                      />
                      <BtnSendCode
                        type="button"
                        disabled={smsCooldown.cooling}
                        onClick={() => void handleSendSms()}>
                        {smsCooldown.label}
                      </BtnSendCode>
                    </CodeRow>
                  </InputGroup>
                </InputWrapper>
              </>
            )}
          </Fields>

          <BtnGroup>
            <BtnPrimary type="submit" disabled={loading}>
              {loading ? "登录中…" : "登录"}
            </BtnPrimary>
            <AuthLinks>
              <BtnText type="button" as={Link} to="/forgot-password">
                忘记密码？
              </BtnText>
              <BtnText type="button" as={Link} to="/register">
                注册账号
              </BtnText>
            </AuthLinks>
          </BtnGroup>
        </FormInner>
      </Form>
    </Page>
  );
}
