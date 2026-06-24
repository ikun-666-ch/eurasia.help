import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { initSlideCaptcha, verifySlideCaptcha } from "@/api";
import { ApiError } from "@/api/client";

const HANDLE_SIZE = 44;
const PASS_RATIO = 0.92;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const Panel = styled.div`
  width: min(360px, 100%);
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111;
`;

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;

  &:hover {
    color: rgba(0, 0, 0, 0.75);
  }
`;

const Hint = styled.p<{ $error?: boolean }>`
  margin: 0 0 12px;
  font-size: 13px;
  color: ${({ $error }) => ($error ? "#c62828" : "rgba(0, 0, 0, 0.55)")};
`;

const Track = styled.div<{ $passed: boolean; $disabled: boolean }>`
  position: relative;
  height: ${HANDLE_SIZE}px;
  border-radius: ${HANDLE_SIZE / 2}px;
  background: ${({ $passed }) => ($passed ? "#e8f5e9" : "#f0eefc")};
  border: 2px solid ${({ $passed }) => ($passed ? "#66bb6a" : "mediumslateblue")};
  overflow: hidden;
  user-select: none;
  touch-action: none;
  opacity: ${({ $disabled }) => ($disabled ? 0.65 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};
`;

const TrackFill = styled.div<{ $width: number }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ $width }) => $width}px;
  background: rgba(123, 104, 238, 0.18);
  pointer-events: none;
  transition: ${({ $width }) => ($width === 0 ? "none" : "width 0.05s linear")};
`;

const TrackLabel = styled.span<{ $passed: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $passed }) => ($passed ? "#2e7d32" : "rgba(0, 0, 0, 0.45)")};
  pointer-events: none;
`;

const Handle = styled.div<{ $offset: number; $passed: boolean; $dragging: boolean }>`
  position: absolute;
  top: 0;
  left: ${({ $offset }) => $offset}px;
  width: ${HANDLE_SIZE - 4}px;
  height: ${HANDLE_SIZE - 4}px;
  margin: 1px;
  border-radius: 50%;
  background: ${({ $passed }) => ($passed ? "#66bb6a" : "mediumslateblue")};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: ${({ $passed }) => ($passed ? "default" : "grab")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ $dragging, $passed }) =>
    $dragging || $passed ? "none" : "left 0.25s ease, background 0.2s ease"};
  z-index: 1;

  &:active {
    cursor: grabbing;
  }

  &::after {
    content: "${({ $passed }) => ($passed ? "✓" : "›")}";
    color: white;
    font-size: ${({ $passed }) => ($passed ? "18px" : "22px")};
    font-weight: 700;
    line-height: 1;
  }
`;

export interface SliderCaptchaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (captchaToken: string) => void;
}

export function SliderCaptchaModal({ open, onClose, onSuccess }: SliderCaptchaModalProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const challengeTokenRef = useRef("");
  const dragStartRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [passed, setPassed] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [hint, setHint] = useState({ text: "请按住滑块，拖动到最右侧", error: false });
  const startXRef = useRef(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const resetSlider = useCallback(() => {
    setOffset(0);
    setDragging(false);
    setPassed(false);
  }, []);

  const loadChallenge = useCallback(async () => {
    setReady(false);
    resetSlider();
    setHint({ text: "验证加载中…", error: false });
    try {
      const data = await initSlideCaptcha();
      challengeTokenRef.current = data.token;
      setReady(true);
      setHint({ text: "请按住滑块，拖动到最右侧", error: false });
    } catch (err) {
      challengeTokenRef.current = "";
      setHint({
        text: err instanceof ApiError ? err.message : "验证加载失败，请关闭后重试",
        error: true,
      });
    }
  }, [resetSlider]);

  useEffect(() => {
    if (!open) return;
    void loadChallenge();
  }, [open, loadChallenge]);

  const maxOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    return Math.max(0, track.clientWidth - HANDLE_SIZE);
  }, []);

  const submitVerification = useCallback(
    async (slideDistance: number) => {
      const track = trackRef.current;
      const trackWidth = track?.clientWidth ?? 0;
      setVerifying(true);
      setHint({ text: "正在校验…", error: false });
      try {
        const result = await verifySlideCaptcha({
          token: challengeTokenRef.current,
          elapsedMs: Math.max(0, Date.now() - dragStartRef.current),
          trackWidth,
          slideDistance,
        });
        setPassed(true);
        setHint({ text: "验证通过，正在发送…", error: false });
        window.setTimeout(() => {
          onSuccess(result.captchaToken);
        }, 350);
      } catch (err) {
        resetSlider();
        setHint({
          text: err instanceof ApiError ? err.message : "滑动验证未通过，请重试",
          error: true,
        });
        await loadChallenge();
      } finally {
        setVerifying(false);
      }
    },
    [loadChallenge, onSuccess, resetSlider],
  );

  const snapBack = useCallback(() => {
    setOffset(0);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || passed || verifying) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = Date.now();
    setDragging(true);
    startXRef.current = e.clientX - offsetRef.current;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || passed || verifying) return;
    const max = maxOffset();
    const next = Math.max(0, Math.min(max, e.clientX - startXRef.current));
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!dragging || passed || verifying) return;
    setDragging(false);
    const max = maxOffset();
    if (max > 0 && offsetRef.current >= max * PASS_RATIO) {
      setOffset(max);
      void submitVerification(max);
    } else {
      snapBack();
    }
  };

  if (!open) return null;

  return (
    <Overlay
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !verifying) onClose();
      }}>
      <Panel role="dialog" aria-modal="true" aria-labelledby="slider-captcha-title">
        <Head>
          <Title id="slider-captcha-title">安全验证</Title>
          <CloseBtn type="button" aria-label="关闭" disabled={verifying} onClick={onClose}>
            ×
          </CloseBtn>
        </Head>
        <Hint $error={hint.error}>{hint.text}</Hint>
        <Track ref={trackRef} $passed={passed} $disabled={!ready || verifying}>
          <TrackFill $width={offset + HANDLE_SIZE / 2} />
          <TrackLabel $passed={passed}>
            {passed ? "验证成功" : "向右滑动完成验证"}
          </TrackLabel>
          <Handle
            $offset={offset}
            $passed={passed}
            $dragging={dragging}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </Track>
      </Panel>
    </Overlay>
  );
}

/** 点击「获取验证码」前先弹出滑块，服务端校验通过后再执行 pending 动作 */
export function useSliderCaptchaGate() {
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<((captchaToken: string) => void | Promise<void>) | null>(null);

  const request = useCallback((action: (captchaToken: string) => void | Promise<void>) => {
    pendingRef.current = action;
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    pendingRef.current = null;
  }, []);

  const handleSuccess = useCallback((captchaToken: string) => {
    setOpen(false);
    const action = pendingRef.current;
    pendingRef.current = null;
    void action?.(captchaToken);
  }, []);

  return { open, request, handleClose, handleSuccess };
}
