import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { initSlideCaptcha, verifySlideCaptcha } from "@/api";
import { ApiError } from "@/api/client";

const PUZZLE_SIZE = 48;
const PUZZLE_TOLERANCE = 6;

/* ---------- styled ---------- */

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
  &:hover { color: rgba(0, 0, 0, 0.75); }
`;

const Hint = styled.p<{ $error?: boolean }>`
  margin: 0 0 12px;
  font-size: 13px;
  color: ${({ $error }) => ($error ? "#c62828" : "rgba(0, 0, 0, 0.55)")};
`;

const CanvasWrap = styled.div<{ $disabled: boolean }>`
  position: relative;
  touch-action: none;
  user-select: none;
  opacity: ${({ $disabled }) => ($disabled ? 0.65 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};
  margin-bottom: 12px;
`;

const StyledCanvas = styled.canvas`
  display: block;
  border-radius: 6px;
`;

const PieceCanvas = styled.canvas<{ $left: number; $snapped: boolean; $dragging: boolean }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}px;
  border-radius: 6px;
  cursor: ${({ $snapped }) => ($snapped ? "default" : "grab")};
  box-shadow: ${({ $snapped }) =>
    $snapped ? "0 0 0 2px #66bb6a" : "0 4px 16px rgba(0,0,0,0.25)"};
  transition: ${({ $dragging, $snapped }) =>
    $dragging || $snapped ? "none" : "left 0.25s ease"};
  &:active { cursor: grabbing; }
`;

/* ---------- puzzle drawing helpers ---------- */

function fillRoundedRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  const hue = (seed * 37) % 360;
  g.addColorStop(0, `hsl(${hue}, 55%, 72%)`);
  g.addColorStop(0.5, `hsl(${(hue + 20) % 360}, 50%, 80%)`);
  g.addColorStop(1, `hsl(${(hue + 45) % 360}, 60%, 68%)`);
  fillRoundedRect(ctx, 0, 0, w, h, 6);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (let y = 6; y < h; y += 15) {
    for (let x = 6; x < w; x += 15) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  for (let i = -h; i < w + h; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
}

function drawGap(ctx: CanvasRenderingContext2D, x: number, size: number, canvasH: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  fillRoundedRect(ctx, x, (canvasH - size) / 2, size, size, 6);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x + 2, (canvasH - size) / 2 + 2, size - 4, size - 4);
  ctx.setLineDash([]);
}

/* ---------- component ---------- */

export interface PuzzleCaptchaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (captchaToken: string) => void;
}

export function PuzzleCaptchaModal({ open, onClose, onSuccess }: PuzzleCaptchaProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement>(null);
  const challengeTokenRef = useRef("");
  const dragStartTimeRef = useRef(0);
  const targetXRef = useRef(0);
  const pieceLeftRef = useRef(0);
  const startXRef = useRef(0);
  const canvasWRef = useRef(300);

  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pieceLeft, setPieceLeft] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapped, setSnapped] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 160 });
  const [hint, setHint] = useState({ text: "验证加载中…", error: false });

  /* ---------- draw puzzle ---------- */

  const renderPuzzle = useCallback((targetX: number, w: number, h: number) => {
    const seed = Math.floor(targetX * 7919) % 10000;
    const size = PUZZLE_SIZE;
    // draw background
    const bg = bgCanvasRef.current;
    if (bg) {
      bg.width = w;
      bg.height = h;
      const bgCtx = bg.getContext("2d")!;
      drawBg(bgCtx, w, h, seed);
      drawGap(bgCtx, targetX, size, h);
    }
    // draw piece
    const piece = pieceCanvasRef.current;
    if (piece) {
      piece.width = size;
      piece.height = size;
      const pCtx = piece.getContext("2d")!;
      pCtx.save();
      pCtx.beginPath();
      pCtx.rect(0, 0, size, size);
      pCtx.clip();
      pCtx.translate(-targetX, -(h - size) / 2);
      drawBg(pCtx, w, h, seed);
      pCtx.restore();
      pCtx.strokeStyle = "rgba(255,255,255,0.6)";
      pCtx.lineWidth = 2;
      pCtx.strokeRect(1, 1, size - 2, size - 2);
    }
  }, []);

  /* ---------- lifecycle ---------- */

  const reset = useCallback(() => {
    pieceLeftRef.current = 0;
    setPieceLeft(0);
    setDragging(false);
    setSnapped(false);
  }, []);

  const loadChallenge = useCallback(async () => {
    setReady(false);
    reset();
    setHint({ text: "验证加载中…", error: false });
    try {
      const data = await initSlideCaptcha();
      challengeTokenRef.current = data.token;
      const bg = bgCanvasRef.current;
      const w = bg?.parentElement?.clientWidth ?? 300;
      canvasWRef.current = w;
      const h = 160;
      setCanvasSize({ w, h });
      const margin = PUZZLE_SIZE + 16;
      const targetX = Math.floor(margin + Math.random() * (w - PUZZLE_SIZE - margin * 2));
      targetXRef.current = targetX;
      const startLeft = Math.max(0, targetX - 40 - Math.random() * 30);
      pieceLeftRef.current = startLeft;
      setPieceLeft(startLeft);
      // wait for canvas to be laid out before drawing
      requestAnimationFrame(() => renderPuzzle(targetX, w, h));
      setReady(true);
      setHint({ text: "请拖动拼图块对准缺口位置", error: false });
    } catch (err) {
      challengeTokenRef.current = "";
      setHint({
        text: err instanceof ApiError ? err.message : "验证加载失败，请关闭后重试",
        error: true,
      });
    }
  }, [reset, renderPuzzle]);

  useEffect(() => {
    if (!open) return;
    void loadChallenge();
  }, [open, loadChallenge]);

  /* ---------- drag handlers ---------- */

  const clampPiece = useCallback((v: number, w: number) => {
    return Math.max(0, Math.min(w - PUZZLE_SIZE, v));
  }, []);

  const submit = useCallback(
    async () => {
      setVerifying(true);
      setHint({ text: "正在校验…", error: false });
      const trackWidth = canvasWRef.current;
      try {
        const result = await verifySlideCaptcha({
          token: challengeTokenRef.current,
          elapsedMs: Math.max(300, Date.now() - dragStartTimeRef.current),
          trackWidth,
          slideDistance: trackWidth,
        });
        setSnapped(true);
        pieceLeftRef.current = targetXRef.current;
        setPieceLeft(targetXRef.current);
        setHint({ text: "验证通过，正在发送…", error: false });
        window.setTimeout(() => {
          onSuccess(result.captchaToken);
        }, 350);
      } catch (err) {
        reset();
        setHint({
          text: err instanceof ApiError ? err.message : "拼图验证未通过，请重试",
          error: true,
        });
        await loadChallenge();
      } finally {
        setVerifying(false);
      }
    },
    [loadChallenge, onSuccess, reset],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready || snapped || verifying) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartTimeRef.current = Date.now();
    setDragging(true);
    startXRef.current = e.clientX - pieceLeftRef.current;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging || snapped || verifying) return;
    const next = clampPiece(e.clientX - startXRef.current, canvasWRef.current);
    pieceLeftRef.current = next;
    setPieceLeft(next);
  };

  const onPointerUp = () => {
    if (!dragging || snapped || verifying) return;
    setDragging(false);
    const target = targetXRef.current;
    if (Math.abs(pieceLeftRef.current - target) <= PUZZLE_TOLERANCE) {
      void submit();
    } else {
      pieceLeftRef.current = 0;
      setPieceLeft(0);
    }
  };

  if (!open) return null;

  return (
    <Overlay
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !verifying) onClose();
      }}
    >
      <Panel role="dialog" aria-modal="true" aria-labelledby="puzzle-captcha-title">
        <Head>
          <Title id="puzzle-captcha-title">安全验证</Title>
          <CloseBtn type="button" aria-label="关闭" disabled={verifying} onClick={onClose}>
            ×
          </CloseBtn>
        </Head>
        <Hint $error={hint.error}>{hint.text}</Hint>
        <CanvasWrap $disabled={!ready || verifying}>
          <StyledCanvas ref={bgCanvasRef} width={canvasSize.w} height={canvasSize.h} />
          <PieceCanvas
            ref={pieceCanvasRef}
            $left={pieceLeft}
            $snapped={snapped}
            $dragging={dragging}
            width={PUZZLE_SIZE}
            height={PUZZLE_SIZE}
            style={{ top: (canvasSize.h - PUZZLE_SIZE) / 2 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </CanvasWrap>
      </Panel>
    </Overlay>
  );
}

export { useSliderCaptchaGate } from "./SliderCaptchaModal";
