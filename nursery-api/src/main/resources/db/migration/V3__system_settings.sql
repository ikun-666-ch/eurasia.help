-- system_settings + daily_metric（对齐 PHP DailyDataSchema）

CREATE TABLE IF NOT EXISTS system_settings (
  id                  INT PRIMARY KEY,
  auto_fill_enabled   TINYINT      NOT NULL DEFAULT 0,
  last_auto_fill_date DATE         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO system_settings (id, auto_fill_enabled) VALUES (1, 0)
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS daily_metric (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  series_key  VARCHAR(64)   NOT NULL,
  stat_date   DATE          NOT NULL,
  city        VARCHAR(64)   NOT NULL DEFAULT '',
  amount      DECIMAL(16,4) NOT NULL DEFAULT 0,
  source      VARCHAR(16)   NOT NULL DEFAULT 'auto',
  UNIQUE KEY uk_daily_metric (series_key, stat_date, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
