import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { marked } from "marked";
import styled, { keyframes } from "styled-components";
import {
  archiveAiConversation,
  deleteAiConversation,
  fetchAiConversation,
  fetchAiConversations,
  fetchProfile,
  renameAiConversation,
  streamAiChat,
} from "@/api";
import { ApiError } from "@/api/client";
import type { AiConversation, AiStoredMessage, AiToolTrace } from "@/api/types";

const ACTIVE_KEY = "nursery_ai_conversation";

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
  width: min(760px, 96vw);
  display: flex;
  flex-direction: row;
  border-left: 1px solid rgba(48, 97, 219, 0.25);
  background: linear-gradient(180deg, #101830 0%, #0a0f1e 100%);
  color: #e8f0ff;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.5);
  animation: ${fadeIn} 0.25s ease;
`;

const Sidebar = styled.aside<{ $open: boolean }>`
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(48, 97, 219, 0.18);
  background: rgba(6, 10, 22, 0.45);

  @media (max-width: 720px) {
    display: ${(p) => (p.$open ? "flex" : "none")};
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(260px, 82%);
    background: #101830;
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.35);
  }
`;

const SidebarHead = styled.div`
  padding: 14px 12px 8px;
`;

const NewChatBtn = styled.button`
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.35);
  background: rgba(99, 102, 241, 0.16);
  color: #e8f0ff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const ConvList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ConvRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: stretch;
  border-radius: 8px;
  background: ${(p) => (p.$active ? "rgba(99, 102, 241, 0.22)" : "transparent")};
  border: 1px solid ${(p) => (p.$active ? "rgba(99, 102, 241, 0.35)" : "transparent")};

  &:hover {
    background: rgba(99, 102, 241, 0.14);
  }
`;

const ConvMain = styled.button`
  flex: 1;
  min-width: 0;
  text-align: left;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 8px 4px 8px 10px;
  font: inherit;

  strong {
    display: block;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: #6b7aaa;
  }
`;

const ConvDelete = styled.button`
  width: 28px;
  border: none;
  background: transparent;
  color: #6b7aaa;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    color: #f87171;
  }
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(48, 97, 219, 0.18);
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  svg {
    width: 20px;
    height: 20px;
    color: #a78bfa;
    flex-shrink: 0;
  }
`;

const TitleBlock = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ModeBadge = styled.span<{ $on: boolean }>`
  display: inline-block;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.4;
  padding: 0 6px;
  border-radius: 999px;
  color: ${(p) => (p.$on ? "#ddd6fe" : "#93a0c8")};
  background: ${(p) => (p.$on ? "rgba(124, 58, 237, 0.28)" : "rgba(255,255,255,0.06)")};
  border: 1px solid ${(p) => (p.$on ? "rgba(167, 139, 250, 0.45)" : "rgba(255,255,255,0.08)")};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const IconBtn = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e8f0ff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ListToggle = styled(IconBtn)`
  display: none;
  @media (max-width: 720px) {
    display: flex;
  }
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Bubble = styled.div<{ $role: "user" | "ai" }>`
  max-width: 85%;
  padding: 7px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
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

const ToolTrace = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: #9aa6d6;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
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

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const EmptyHint = styled.p`
  margin: 24px 8px;
  color: #6b7aaa;
  font-size: 13px;
  line-height: 1.6;
`;

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
`;

interface UiMessage {
  role: "user" | "ai";
  text: string;
  toolTrace?: AiToolTrace[];
  localError?: boolean;
}

function shortTime(value?: string) {
  if (!value) return "";
  const text = value.replace("T", " ");
  return text.length >= 16 ? text.slice(5, 16) : text;
}

function toUi(message: AiStoredMessage): UiMessage {
  return {
    role: message.role === "user" ? "user" : "ai",
    text: message.content,
    toolTrace: message.toolTrace,
  };
}

interface AiChatProps {
  open: boolean;
  onClose: () => void;
}

export default function AiChat({ open, onClose }: AiChatProps) {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("新对话");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const remember = (id: number | null) => {
    if (id == null) {
      localStorage.removeItem(ACTIVE_KEY);
    } else {
      localStorage.setItem(ACTIVE_KEY, String(id));
    }
  };

  const openConversation = async (id: number) => {
    const detail = await fetchAiConversation(id);
    setActiveId(detail.id);
    setTitle(detail.title || "新对话");
    setMessages((detail.messages ?? []).map(toUi));
    remember(detail.id);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, profile] = await Promise.all([
          fetchAiConversations(),
          fetchProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setAgentEnabled(Boolean(profile?.aiAgentEnabled));
        setConversations(list);
        const saved = Number(localStorage.getItem(ACTIVE_KEY) || "");
        const target = list.find((item) => item.id === saved) ?? list[0];
        if (target) {
          await openConversation(target.id);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : "对话加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // 只在面板第一次挂载时从服务端恢复会话。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, sending]);

  const startNew = () => {
    setActiveId(null);
    setTitle("新对话");
    setMessages([]);
    remember(null);
    setListOpen(false);
  };

  const selectConversation = async (id: number) => {
    if (sending || id === activeId) {
      setListOpen(false);
      return;
    }
    setLoadError(null);
    try {
      await openConversation(id);
      setListOpen(false);
    } catch (e: unknown) {
      setLoadError(e instanceof ApiError ? e.message : "打开对话失败");
    }
  };

  const removeConversation = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteAiConversation(id);
      const rest = conversations.filter((item) => item.id !== id);
      setConversations(rest);
      if (activeId === id) {
        if (rest[0]) {
          await openConversation(rest[0].id);
        } else {
          startNew();
        }
      }
    } catch (e: unknown) {
      setLoadError(e instanceof ApiError ? e.message : "删除失败");
    }
  };

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      fetchAiConversations(query, showArchived)
        .then(setConversations)
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, showArchived, loading]);

  const saveTitle = async () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!activeId || !next || next === title) return;
    try {
      const saved = await renameAiConversation(activeId, next);
      setTitle(saved.title);
      setConversations((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
    } catch (e: unknown) {
      setLoadError(e instanceof ApiError ? e.message : "重命名失败");
    }
  };

  const toggleArchive = async (item: AiConversation) => {
    try {
      const saved = await archiveAiConversation(item.id, !item.archived);
      if (saved.archived !== showArchived) {
        setConversations((prev) => prev.filter((row) => row.id !== saved.id));
      } else {
        setConversations((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      }
      if (activeId === saved.id && saved.archived && !showArchived) startNew();
    } catch (e: unknown) {
      setLoadError(e instanceof ApiError ? e.message : "归档失败");
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setStatusLabel(agentEnabled ? "正在思考" : "正在回答");
    setLoadError(null);
    setMessages((prev) => [...prev.filter((item) => !item.localError), { role: "user", text }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await streamAiChat(
        { conversationId: activeId, message: text },
        setStatusLabel,
        controller.signal
      );
      setAgentEnabled(data.agentEnabled);
      setActiveId(data.conversation.id);
      setTitle(data.conversation.title || "新对话");
      remember(data.conversation.id);
      setConversations((prev) => [data.conversation, ...prev.filter((item) => item.id !== data.conversation.id)]);
      setMessages((prev) => [...prev, { role: "ai", text: data.reply, toolTrace: data.toolTrace }]);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setMessages((prev) => [...prev, { role: "ai", text: "已停止。", localError: true }]);
        fetchAiConversations(query, showArchived).then(setConversations).catch(() => undefined);
        return;
      }
      setInput(text);
      const message = e instanceof ApiError ? e.message : "请求失败";
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "user" && last.text === text) next.pop();
        next.push({ role: "ai", text: `抱歉，${message}`, localError: true });
        return next;
      });
    } finally {
      abortRef.current = null;
      setStatusLabel("");
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!open) return null;

  return (
    <>
      <Overlay onClick={onClose} />
      <Panel>
        <Sidebar $open={listOpen}>
          <SidebarHead>
            <NewChatBtn type="button" onClick={startNew} disabled={sending}>
              新对话
            </NewChatBtn>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索对话"
              aria-label="搜索对话"
              style={{
                width: "100%",
                marginTop: 8,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid rgba(99, 102, 241, 0.25)",
                background: "rgba(12, 18, 36, 0.8)",
                color: "#e8f0ff",
                padding: "7px 8px",
                font: "inherit",
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              style={{
                marginTop: 8,
                border: "none",
                background: "transparent",
                color: "#9aa6d6",
                cursor: "pointer",
                font: "inherit",
                fontSize: 12,
                padding: 0,
              }}
            >
              {showArchived ? "查看未归档" : "查看已归档"}
            </button>
          </SidebarHead>
          <ConvList>
            {conversations.length === 0 && <EmptyHint>还没有对话。发送第一条消息后会留在这里。</EmptyHint>}
            {conversations.map((item) => (
              <ConvRow key={item.id} $active={item.id === activeId}>
                <ConvMain type="button" onClick={() => void selectConversation(item.id)}>
                  <strong>{item.title || "新对话"}</strong>
                  <span>{shortTime(item.updatedAt)}</span>
                </ConvMain>
                <ConvDelete
                  type="button"
                  aria-label={item.archived ? `取消归档 ${item.title}` : `归档 ${item.title}`}
                  onClick={() => void toggleArchive(item)}
                >
                  {item.archived ? "↩" : "↓"}
                </ConvDelete>
                <ConvDelete
                  type="button"
                  aria-label={`删除对话 ${item.title}`}
                  onClick={() => setPendingDelete(item)}
                >
                  ×
                </ConvDelete>
              </ConvRow>
            ))}
          </ConvList>
        </Sidebar>
        <Main>
          <Header>
            <HeaderLeft>
              <ListToggle type="button" aria-label="会话列表" onClick={() => setListOpen((value) => !value)}>
                ≡
              </ListToggle>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5Z" />
              </svg>
              <TitleBlock>
                {editingTitle ? (
                  <input
                    value={titleDraft}
                    aria-label="对话标题"
                    autoFocus
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={() => void saveTitle()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveTitle();
                      }
                    }}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(99, 102, 241, 0.35)",
                      borderRadius: 6,
                      background: "rgba(12, 18, 36, 0.8)",
                      color: "#e8f0ff",
                      font: "inherit",
                      fontSize: 14,
                      padding: "2px 6px",
                    }}
                  />
                ) : (
                  <strong>{title}</strong>
                )}
                <ModeBadge $on={agentEnabled}>{agentEnabled ? "Agent" : "问答"}</ModeBadge>
              </TitleBlock>
            </HeaderLeft>
            <HeaderRight>
              <IconBtn
                type="button"
                title="重命名"
                aria-label="重命名对话"
                disabled={!activeId || sending}
                onClick={() => {
                  setTitleDraft(title);
                  setEditingTitle(true);
                }}
              >
                ✎
              </IconBtn>
              <IconBtn type="button" title="新对话" aria-label="新对话" onClick={startNew} disabled={sending}>
                +
              </IconBtn>
              <IconBtn type="button" onClick={onClose} aria-label="关闭">
                ✕
              </IconBtn>
            </HeaderRight>
          </Header>
          <Messages>
            {loading && <EmptyHint>正在恢复对话…</EmptyHint>}
            {!loading && loadError && <EmptyHint>{loadError}</EmptyHint>}
            {!loading && messages.length === 0 && (
              <div>
                <RoleLabel>AI 助手</RoleLabel>
                <Bubble $role="ai">
                  <MarkdownBody>你好，我是 AI 助手小林，有什么可以帮你的？</MarkdownBody>
                </Bubble>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} style={{ display: "flex", flexDirection: "column", alignItems: message.role === "user" ? "flex-end" : "flex-start" }}>
                {message.role === "ai" && <RoleLabel>AI 助手</RoleLabel>}
                <Bubble $role={message.role}>
                  {message.toolTrace && message.toolTrace.length > 0 && (
                    <ToolTrace>
                      {message.toolTrace.map((item) => `${item.ok ? "" : "失败："}${item.label}`).join(" · ")}
                    </ToolTrace>
                  )}
                  <MarkdownBody dangerouslySetInnerHTML={{ __html: marked.parse(message.text) as string }} />
                </Bubble>
              </div>
            ))}
            {sending && (
              <div>
                <RoleLabel>AI 助手</RoleLabel>
                <Bubble $role="ai">
                  <MarkdownBody>{statusLabel || (agentEnabled ? "正在思考" : "思考中...")}</MarkdownBody>
                </Bubble>
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
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {sending ? (
              <SendBtn type="button" aria-label="停止" onClick={() => abortRef.current?.abort()}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </SendBtn>
            ) : (
              <SendBtn type="submit" disabled={loading || !input.trim()} aria-label="发送">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </SendBtn>
            )}
          </InputBar>
        </Main>
      </Panel>
      {pendingDelete && (
        <ConfirmOverlay>
          <ConfirmBox>
            <ConfirmText>删除对话「{pendingDelete.title || "新对话"}」？消息会从账号里去掉。</ConfirmText>
            <ConfirmActions>
              <ConfirmBtn type="button" onClick={() => setPendingDelete(null)}>取消</ConfirmBtn>
              <ConfirmBtn type="button" $danger onClick={() => void removeConversation()}>删除</ConfirmBtn>
            </ConfirmActions>
          </ConfirmBox>
        </ConfirmOverlay>
      )}
    </>
  );
}
