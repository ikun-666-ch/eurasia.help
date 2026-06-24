import { cloneElement, isValidElement, useRef, useState } from "react";
import styled from "styled-components";
import EditPanelModal from "./EditPanelModal";
import { usePanelRefresh } from "./PanelRefreshContext";
import type { PanelEditorType } from "./panelEditors";
import { PanelEditorForm } from "./panelEditors";

const Hint = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(186, 230, 253, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 116, 144, 0.25);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
`;

const Shell = styled.div<{ $editable?: boolean }>`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  cursor: ${(p) => (p.$editable ? "pointer" : "default")};

  &:hover ${Hint} {
    opacity: 1;
  }
`;

type Props = {
  title: string;
  panelKey?: string;
  editorType?: PanelEditorType;
  editorContext?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function ClickablePanel({
  title,
  panelKey,
  editorType,
  editorContext,
  children,
  className,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const { version, bump } = usePanelRefresh();
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const editable = Boolean(editorType);

  const preview =
    isValidElement(children) && editable
      ? cloneElement(children as React.ReactElement<{ refreshToken?: number }>, {
          refreshToken: version,
        })
      : children;

  return (
    <>
      <Shell
        className={className}
        style={style}
        $editable={editable}
        onClick={(e) => {
          if (!editable) return;
          if (
            (e.target as HTMLElement).closest(
              "button, a, input, select, textarea"
            )
          ) {
            return;
          }
          setOpen(true);
        }}>
        {editable && <Hint>点击编辑</Hint>}
        {preview}
      </Shell>

      {editable && editorType && (
        <EditPanelModal
          open={open}
          title={`编辑 · ${title}`}
          preview={preview}
          editor={
            <PanelEditorForm
              editorType={editorType}
              panelKey={panelKey}
              editorContext={editorContext}
              registerSave={(fn) => {
                saveRef.current = fn;
              }}
            />
          }
          onClose={() => setOpen(false)}
          onSave={async () => {
            if (!saveRef.current) return;
            await saveRef.current();
            bump();
          }}
        />
      )}
    </>
  );
}
