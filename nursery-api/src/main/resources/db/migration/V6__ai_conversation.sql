-- 小林的会话记录。按登录用户隔离，关闭面板或刷新后仍可继续。
CREATE TABLE IF NOT EXISTS ai_conversation (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  title       VARCHAR(128) NOT NULL DEFAULT '新对话',
  archived    TINYINT      NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_conversation_user (user_id, updated_at),
  CONSTRAINT fk_ai_conversation_user FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_message (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id  BIGINT      NOT NULL,
  role             VARCHAR(16) NOT NULL,
  content          MEDIUMTEXT  NOT NULL,
  tool_trace       TEXT        NULL,
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_message_conversation (conversation_id, id),
  CONSTRAINT fk_ai_message_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversation(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 小林代用户写入时的审计。可撤销的操作保存变更前后的快照。
CREATE TABLE IF NOT EXISTS ai_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id          BIGINT       NOT NULL,
  conversation_id  BIGINT       NULL,
  tool_name        VARCHAR(64)  NOT NULL,
  action           VARCHAR(64)  NOT NULL,
  summary          VARCHAR(512) NOT NULL,
  before_json      MEDIUMTEXT   NULL,
  after_json       MEDIUMTEXT   NULL,
  reversible       TINYINT      NOT NULL DEFAULT 0,
  undone_at        DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_audit_user (user_id, id),
  CONSTRAINT fk_ai_audit_user FOREIGN KEY (user_id) REFERENCES sys_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
