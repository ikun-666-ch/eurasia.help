import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const zoomIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 0.2s ease;
`;

const Dialog = styled.div`
  width: min(1100px, 96vw);
  max-height: 90vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-radius: 12px;
  border: 1px solid rgba(96, 165, 250, 0.35);
  background: linear-gradient(160deg, #0f172a 0%, #111827 100%);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  animation: ${zoomIn} 0.25s ease;
  overflow: hidden;
  color: #e8f0ff;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  button {
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
    &:hover {
      color: #e2e8f0;
    }
  }
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
`;

const Preview = styled.div`
  padding: 16px;
  border-right: 1px solid rgba(96, 165, 250, 0.15);
  min-height: 280px;
  max-height: calc(90vh - 140px);
  overflow: auto;
  background: rgba(15, 23, 42, 0.45);

  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid rgba(96, 165, 250, 0.15);
    max-height: 240px;
  }
`;

const FormArea = styled.div`
  padding: 16px 20px;
  overflow-y: auto;
  max-height: calc(90vh - 140px);
`;

const Foot = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(96, 165, 250, 0.2);
`;

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid
    ${(p) => (p.$primary ? "rgba(56, 189, 248, 0.6)" : "rgba(148, 163, 184, 0.35)")};
  background: ${(p) =>
    p.$primary ? "linear-gradient(135deg, #0ea5e9, #2563eb)" : "transparent"};
  color: ${(p) => (p.$primary ? "#fff" : "#cbd5e1")};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Err = styled.div`
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(127, 29, 29, 0.35);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  font-size: 12px;
`;

type Props = {
  open: boolean;
  title: string;
  preview: React.ReactNode;
  editor: React.ReactNode;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export default function EditPanelModal({
  open,
  title,
  preview,
  editor,
  onClose,
  onSave,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <Overlay onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <Head>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </Head>
        <Body>
          <Preview>{preview}</Preview>
          <FormArea>
            {error && <Err>{error}</Err>}
            {editor}
          </FormArea>
        </Body>
        <Foot>
          <Btn type="button" onClick={onClose}>
            取消
          </Btn>
          <Btn type="button" $primary disabled={saving} onClick={handleSave}>
            {saving ? "保存中…" : "保存"}
          </Btn>
        </Foot>
      </Dialog>
    </Overlay>,
    document.body
  );
}
