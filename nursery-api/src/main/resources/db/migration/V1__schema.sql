-- 对齐 PHP nursery-php 表结构（Phase 1 基础 + 后续模块预留字段）

CREATE TABLE IF NOT EXISTS sys_role (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(32)  NOT NULL UNIQUE,
  name          VARCHAR(64)  NOT NULL,
  permissions   VARCHAR(512) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_user (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  username            VARCHAR(64)  NOT NULL UNIQUE,
  display_name        VARCHAR(64)  NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role_id             BIGINT       NOT NULL,
  status              VARCHAR(16)  NOT NULL DEFAULT 'OFFLINE',
  last_login_at       DATETIME     NULL,
  phone               VARCHAR(11)  NULL,
  extra_page_access   VARCHAR(512) NOT NULL DEFAULT '[]',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES sys_role(id),
  UNIQUE KEY uk_sys_user_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seedling_category (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id   BIGINT       NULL,
  name        VARCHAR(64)  NOT NULL,
  level       TINYINT      NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES seedling_category(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(128) NOT NULL,
  contact_name  VARCHAR(64)  NULL,
  region        VARCHAR(64)  NULL,
  district      VARCHAR(64)  NULL,
  level         CHAR(1)      NOT NULL DEFAULT 'B',
  phone         VARCHAR(32)  NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_sku (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  variety         VARCHAR(64) NOT NULL,
  specification   VARCHAR(64) NOT NULL,
  category_id     BIGINT      NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_variety_spec (variety, specification)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_stock (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku_id      BIGINT        NOT NULL,
  warehouse   VARCHAR(64)   NOT NULL DEFAULT '主仓库',
  city        VARCHAR(64)   NULL,
  quantity    DECIMAL(14,2) NOT NULL DEFAULT 0,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_sku FOREIGN KEY (sku_id) REFERENCES inventory_sku(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_record (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku_id       BIGINT        NOT NULL,
  record_type  VARCHAR(16)   NOT NULL,
  quantity     DECIMAL(14,2) NOT NULL,
  remark       VARCHAR(255)  NULL,
  operator_id  BIGINT        NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_record_sku FOREIGN KEY (sku_id) REFERENCES inventory_sku(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_order (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no        VARCHAR(32)   NOT NULL UNIQUE,
  customer_id     BIGINT        NOT NULL,
  status          VARCHAR(16)   NOT NULL DEFAULT 'DRAFT',
  total_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
  satisfaction    TINYINT       NULL,
  salesperson_id  BIGINT        NULL,
  tracking_no     VARCHAR(64)   NULL,
  variety         VARCHAR(64)   NULL,
  specification   VARCHAR(64)   NULL,
  tracking_com    VARCHAR(32)   NULL,
  quantity        INT           NULL,
  cost_amount     DECIMAL(14,2) NULL,
  profit_amount   DECIMAL(14,2) NULL,
  rejected_at     DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS finance_monthly (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  `year_month`    CHAR(7)       NOT NULL,
  revenue         DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost            DECIMAL(14,2) NOT NULL DEFAULT 0,
  profit          DECIMAL(14,2) NOT NULL DEFAULT 0,
  asset_value     DECIMAL(14,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_finance_month (`year_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_config (
  panel_key     VARCHAR(128) PRIMARY KEY,
  payload_json  TEXT         NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS finance_settings (
  id                      INT PRIMARY KEY,
  growth_rate_cumulative  DECIMAL(8,2) NOT NULL DEFAULT 12,
  growth_rate_yoy         DECIMAL(8,2) NOT NULL DEFAULT 18,
  q1_share                DECIMAL(8,2) NOT NULL DEFAULT 30,
  q2_share                DECIMAL(8,2) NOT NULL DEFAULT 25,
  q3_share                DECIMAL(8,2) NOT NULL DEFAULT 25,
  q4_share                DECIMAL(8,2) NOT NULL DEFAULT 20
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS finance_daily_revenue (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  city        VARCHAR(64)   NOT NULL,
  stat_date   DATE          NOT NULL,
  period      VARCHAR(8)    NOT NULL,
  amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_fin_daily (city, stat_date, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS finance_monthly_city (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  `year_month` CHAR(7)       NOT NULL,
  city         VARCHAR(64)   NOT NULL,
  revenue      DECIMAL(14,2) NOT NULL DEFAULT 0,
  profit       DECIMAL(14,2) NOT NULL DEFAULT 0,
  asset_value  DECIMAL(14,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_fin_month_city (`year_month`, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nursery_asset_stat (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  city        VARCHAR(64)   NOT NULL,
  label       VARCHAR(64)   NOT NULL,
  value       DECIMAL(14,2) NOT NULL DEFAULT 0,
  label2      VARCHAR(64)   NOT NULL,
  value2      DECIMAL(14,2) NOT NULL DEFAULT 0,
  unit        VARCHAR(16)   NOT NULL DEFAULT '处',
  sort_order  INT           NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_daily_order (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  city       VARCHAR(64) NOT NULL,
  day_index  INT         NOT NULL,
  amount     DECIMAL(14,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_sales_daily (city, day_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
