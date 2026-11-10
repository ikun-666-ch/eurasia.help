import { useState } from "react";
import { useLocation } from "react-router";
import styled from "styled-components";
import { getToken } from "@/api/client";
import AiChat from "./AiChat";

const Launcher = styled.button`
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 900;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
  color: #fff;
  cursor: pointer;
  box-shadow:
    0 0 20px rgba(99, 102, 241, 0.4),
    0 4px 16px rgba(0, 0, 0, 0.4);

  svg {
    width: 26px;
    height: 26px;
  }

  &:hover {
    transform: scale(1.06);
  }
`;

const HIDDEN = new Set(["/login", "/register", "/forgot-password"]);

export default function AiAssistantHost() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const loggedIn = Boolean(getToken());
  if (!loggedIn || HIDDEN.has(location.pathname)) return null;

  return (
    <>
      {!open && (
        <Launcher type="button" aria-label="打开 AI 助手" title="AI 助手" onClick={() => {
          setMounted(true);
          setOpen(true);
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5Z" />
          </svg>
        </Launcher>
      )}
      {mounted && <AiChat open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
