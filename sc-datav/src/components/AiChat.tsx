import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { api } from "@/api/client";
import { marked } from "marked";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(4, 8, 18, 0.55);
  animation: ${fadeIn} 0.2s ease;
`;

const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  width: min(420px, 92vw);
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(48, 97, 219, 0.25);
  background: linear-gradient(180deg, #101830 0%, #0a0f1e 100%);
  color: #e8f0ff;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.5);
  animation: ${fadeIn} 0.25s ease;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(48, 97, 219, 0.18);
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    width: 22px;
    height: 22px;
    color: #a78bfa;
  }

  span {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #a0aec0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition:
    background 0.2s,
    color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e8f0ff;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ClearBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #a0aec0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition:
    background 0.2s,
    color 0.2s;

  &:hover {
    background: rgba(244, 63, 94, 0.15);
    color: #f87171;
    border-color: rgba(244, 63, 94, 0.3);
  }
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 4px;
  }
`;

const Bubble = styled.div<{ $role: "user" | "ai" }>`
  max-width: 85%;
  padding: 7px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: 0.02em;
  animation: ${slideUp} 0.3s ease;
  align-self: ${(p) => (p.$role === "user" ? "flex-end" : "flex-start")};

  ${(p) =>
    p.$role === "user"
      ? `
    background: linear-gradient(135deg, #6366f1, #7c3aed);
    color: #ffffff;
    border-bottom-right-radius: 4px;
  `
      : `
    background: rgba(99, 102, 241, 0.12);
    color: #dde4ff;
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-bottom-left-radius: 4px;
  `}
`;


const MarkdownBody = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0;
    font-size: 13px;
  }
  th, td {
    padding: 6px 10px;
    text-align: left;
    border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  }
  th {
    color: #9aa5d0;
    font-weight: 600;
    font-size: 12px;
  }
  td {
    color: #dde4ff;
  }
  code {
    background: rgba(99, 102, 241, 0.15);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  strong {
    color: #c4b5fd;
  }
`;

const RoleLabel = styled.div`
  font-size: 11px;
  color: #6b7aaa;
  margin-bottom: 6px;
  padding: 0 4px;
`;

const InputBar = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(48, 97, 219, 0.18);
  flex-shrink: 0;
  background: rgba(6, 10, 22, 0.6);
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 14px;
  line-height: 1.5;
  background: rgba(12, 18, 36, 0.8);
  color: #e8f0ff;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;

  &::placeholder {
    color: #4a5580;
  }

  &:focus {
    border-color: rgba(99, 102, 241, 0.5);
  }
`;

const SendBtn = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #7c3aed);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    opacity 0.2s,
    transform 0.15s;

  &:hover {
    opacity: 0.9;
  }
  &:active {
    transform: scale(0.95);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

interface Message {
  role: "user" | "ai";
  text: string;
}

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 8, 18, 0.6);
`;

const ConfirmBox = styled.div`
  background: linear-gradient(180deg, #1a2040 0%, #121a30 100%);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 12px;
  padding: 24px;
  width: 300px;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
`;

const ConfirmText = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: #dde4ff;
  line-height: 1.5;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const ConfirmBtn = styled.button<{ $danger?: boolean }>`
  padding: 7px 20px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$danger ? "rgba(244, 63, 94, 0.4)" : "rgba(255, 255, 255, 0.12)")};
  background: ${(p) => (p.$danger ? "rgba(244, 63, 94, 0.15)" : "rgba(255, 255, 255, 0.05)")};
  color: ${(p) => (p.$danger ? "#f87171" : "#a0aec0")};
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;

  &:hover {
    background: ${(p) => (p.$danger ? "rgba(244, 63, 94, 0.25)" : "rgba(255, 255, 255, 0.1)")};
  }
`;

interface AiChatProps {
  onClose: () => void;
}

export default function AiChat({ onClose }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "你好，我是 AI 助手小林，有什么可以帮你的？",
    },
  ]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    setConfirmClear(true);
  };

  const doClear = () => {
    setMessages([
      {
        role: "ai",
        text: "你好，我是 AI 助手小林，有什么可以帮你的？",
      },
    ]);
    setHistory([]);
    setConfirmClear(false);
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const newHistory = [...history, { role: "user", content: text }];
      const data: { reply: string } = await api.post("/ai/chat", {
        messages: newHistory,
      });
      const aiMsg: Message = { role: "ai", text: data.reply };
      setMessages((prev) => [...prev, aiMsg]);
      setHistory([...newHistory, { role: "assistant", content: data.reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "请求失败";
      const aiMsg: Message = { role: "ai", text: `抱歉，${msg}` };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <Panel>
        <Header>
          <HeaderLeft>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5Z" />
            </svg>
            <span>AI 助手</span>
          </HeaderLeft>
          <HeaderRight>
            <ClearBtn onClick={handleClear} title="清除聊天记录" aria-label="清除聊天记录">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </ClearBtn>
            <CloseBtn onClick={onClose} aria-label="关闭">
              ✕
            </CloseBtn>
          </HeaderRight>
        </Header>

        <Messages>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "ai" && <RoleLabel>AI 助手</RoleLabel>}
              <Bubble $role={m.role}><MarkdownBody dangerouslySetInnerHTML={{ __html: marked.parse(m.text) as string }} /></Bubble>
            </div>
          ))}
          {sending && (
            <div style={{ alignSelf: "flex-start" }}>
              <RoleLabel>AI 助手</RoleLabel>
              <Bubble $role="ai"><MarkdownBody>思考中...</MarkdownBody></Bubble>
            </div>
          )}
          <div ref={bottomRef} />
        </Messages>

        <InputBar onSubmit={handleSubmit}>
          <TextArea
            ref={inputRef}
            rows={1}
            placeholder="输入你的问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendBtn type="submit" disabled={sending || !input.trim()} aria-label="发送">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </SendBtn>
        </InputBar>
      </Panel>
      {confirmClear && (
        <ConfirmOverlay>
          <ConfirmBox>
            <ConfirmText>确定要清除所有聊天记录吗？</ConfirmText>
            <ConfirmActions>
              <ConfirmBtn onClick={() => setConfirmClear(false)}>取消</ConfirmBtn>
              <ConfirmBtn $danger onClick={doClear}>清除</ConfirmBtn>
            </ConfirmActions>
          </ConfirmBox>
        </ConfirmOverlay>
      )}
    </>
  );
}
