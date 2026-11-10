-- 每个用户自己决定是否启用 AI Agent。默认关闭，保持原来的问答模式。
ALTER TABLE sys_user
  ADD COLUMN ai_agent_enabled TINYINT NOT NULL DEFAULT 0;
