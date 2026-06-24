import { useEffect, useRef } from "react";
import styled from "styled-components";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease;
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const Box = styled.div`
  width: 440px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 10px;
  background: linear-gradient(170deg, #0f172a 0%, #0a0f1f 100%);
  box-shadow: 0 0 60px rgba(56, 189, 248, 0.15);
  animation: slideUp 0.2s ease;
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.18);
  h2 {
    margin: 0;
    font-size: 17px;
    color: #f0f9ff;
    letter-spacing: 0.04em;
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(148, 163, 184, 0.8);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  &:hover { color: #f0f9ff; background: rgba(56,189,248,0.15); }
`;

const Body = styled.div`
  padding: 20px 22px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px 18px;
`;

const BtnPrimary = styled.button`
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid #3061DB;
  background: linear-gradient(135deg, #3061DB, #4F46E5);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  &:hover { box-shadow: 0 0 12px rgba(48,97,219,0.5); }
  &:disabled { opacity: 0.5; cursor: default; }
`;

const BtnSecondary = styled.button`
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid rgba(148,163,184,0.3);
  background: rgba(15,23,42,0.6);
  color: rgba(226,232,240,0.85);
  font-size: 13px;
  cursor: pointer;
  &:hover { border-color: rgba(148,163,184,0.5); background: rgba(30,41,59,0.6); }
`;

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({
  title,
  open,
  onClose,
  onConfirm,
  confirmLabel = "确认",
  confirmDisabled = false,
  children,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Overlay ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <Box>
        <Head>
          <h2>{title}</h2>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </Head>
        <Body>{children}</Body>
        <Footer>
          {footer ?? (
            <>
              <BtnSecondary onClick={onClose}>取消</BtnSecondary>
              <BtnPrimary onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</BtnPrimary>
            </>
          )}
        </Footer>
      </Box>
    </Overlay>
  );
}
