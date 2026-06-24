import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { fetchRegisterRoles, registerWithPhone, sendRegisterCode } from "@/api";
import { ApiError } from "@/api/client";
import type { RegisterRoleOption } from "@/api/types";
import {
  PuzzleCaptchaModal,
  useSliderCaptchaGate,
} from "@/components/PuzzleCaptchaModal";
import {
  AuthSelect,
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
import { CodeIcon, LockIcon, PhoneIcon, UserIcon } from "./icons";

const MOBILE_RE = /^1\d{10}$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/home";

  const [roles, setRoles] = useState<RegisterRoleOption[]>([]);
  const [roleCode, setRoleCode] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const captcha = useSliderCaptchaGate();

  useEffect(() => {
    void fetchRegisterRoles()
      .then((list) => setRoles(list))
      .catch(() => {
        setError("无法加载身份列表，请刷新页面");
      });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const isAdminRole = roleCode === "ADMIN";

  const sendCode = async (phone: string, captchaToken: string) => {
    setSending(true);
    try {
      await sendRegisterCode(phone, captchaToken);
      setCountdown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "验证码发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleSendCode = () => {
    setError(null);
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

    const phone = mobile.trim();
    if (!MOBILE_RE.test(phone)) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    if (!code.trim()) {
      setError("请输入短信验证码");
      return;
    }
    if (!roleCode) {
      setError("请选择身份");
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
    if (isAdminRole) {
      const keyDigits = adminKey.replace(/\D/g, "");
      if (keyDigits.length !== 10) {
        setError("请输入 10 位管理员密钥");
        return;
      }
    }

    setLoading(true);
    try {
      await registerWithPhone({
        mobile: phone,
        code: code.trim(),
        password,
        displayName: displayName.trim() || undefined,
        roleCode,
        ...(isAdminRole ? { adminKey: adminKey.replace(/\D/g, "") } : {}),
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败，请稍后重试");
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
            <Title>注册账号</Title>
            <Subtitle>使用手机号 + 短信验证码注册</Subtitle>
          </Header>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Fields>
            <InputWrapper>
              <Label htmlFor="roleCode">身份</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <UserIcon />
                </Icon>
                <AuthSelect
                  id="roleCode"
                  value={roleCode}
                  onChange={(e) => {
                    setRoleCode(e.target.value);
                    if (e.target.value !== "ADMIN") {
                      setAdminKey("");
                    }
                  }}
                  required>
                  {roles.length === 0 ? (
                    <option value="">加载中…</option>
                  ) : (
                    <>
                      <option value="" disabled>
                        请选择身份
                      </option>
                      {roles.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </>
                  )}
                </AuthSelect>
              </InputGroup>
            </InputWrapper>

            {isAdminRole && (
              <InputWrapper>
                <Label htmlFor="adminKey">管理员密钥</Label>
                <InputGroup>
                  <Icon className="auth-icon">
                    <LockIcon />
                  </Icon>
                  <Input
                    id="adminKey"
                    type="password"
                    inputMode="numeric"
                    maxLength={10}
                    value={adminKey}
                    onChange={(e) =>
                      setAdminKey(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10 位数字密钥"
                    autoComplete="off"
                    required
                  />
                </InputGroup>
              </InputWrapper>
            )}

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
                  placeholder="11 位手机号"
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
              <Label htmlFor="displayName">姓名（选填）</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <UserIcon />
                </Icon>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="显示名称"
                  autoComplete="name"
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
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  required
                />
              </InputGroup>
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="confirmPassword">确认密码</Label>
              <InputGroup>
                <Icon className="auth-icon">
                  <LockIcon />
                </Icon>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  required
                />
              </InputGroup>
            </InputWrapper>
          </Fields>

          <BtnGroup>
            <BtnPrimary type="submit" disabled={loading}>
              {loading ? "注册中…" : "注册并登录"}
            </BtnPrimary>
            <BtnText type="button" as={Link} to="/login">
              已有账号？去登录
            </BtnText>
          </BtnGroup>
        </FormInner>
      </Form>
    </Page>
  );
}
