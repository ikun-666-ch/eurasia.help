-- 陕西省林业苗圃资产与销售系统
-- 在宝塔 MySQL 中执行：先建库，再导入本文件

CREATE DATABASE IF NOT EXISTS nursery_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE nursery_db;

-- ========== 系统管理 ==========

CREATE TABLE IF NOT EXISTS sys_role (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(32)  NOT NULL UNIQUE COMMENT 'ADMIN/INVENTORY/SALES/FINANCE',
  name          VARCHAR(64)  NOT NULL,
  permissions   VARCHAR(512) NULL COMMENT '权限描述',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_user (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  username        VARCHAR(64)  NOT NULL UNIQUE,
  display_name    VARCHAR(64)  NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role_id         BIGINT       NOT NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'OFFLINE' COMMENT 'ONLINE/OFFLINE/DISABLED',
  last_login_at   DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES sys_role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 基础数据 ==========

CREATE TABLE IF NOT EXISTS seedling_category (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id   BIGINT       NULL,
  name        VARCHAR(64)  NOT NULL,
  level       TINYINT      NOT NULL DEFAULT 1 COMMENT '1/2/3 级',
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES seedling_category(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(128) NOT NULL,
  contact_name  VARCHAR(64)  NULL,
  region        VARCHAR(64)  NULL,
  level         CHAR(1)      NOT NULL DEFAULT 'B' COMMENT 'A/B/C',
  phone         VARCHAR(32)  NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 库存 ==========

CREATE TABLE IF NOT EXISTS inventory_sku (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  variety         VARCHAR(64) NOT NULL COMMENT '品种',
  specification   VARCHAR(64) NOT NULL COMMENT '规格',
  category_id     BIGINT      NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_variety_spec (variety, specification),
  CONSTRAINT fk_sku_category FOREIGN KEY (category_id) REFERENCES seedling_category(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_stock (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku_id      BIGINT        NOT NULL,
  warehouse   VARCHAR(64)   NOT NULL DEFAULT '主仓库',
  city        VARCHAR(64)   NULL COMMENT '所属地市',
  quantity    DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '万株',
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_sku FOREIGN KEY (sku_id) REFERENCES inventory_sku(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_record (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku_id       BIGINT        NOT NULL,
  record_type  VARCHAR(16)   NOT NULL COMMENT 'IN/OUT/ADJUST/CHECK',
  quantity     DECIMAL(14,2) NOT NULL,
  remark       VARCHAR(255)  NULL,
  operator_id  BIGINT        NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_record_sku FOREIGN KEY (sku_id) REFERENCES inventory_sku(id),
  CONSTRAINT fk_record_operator FOREIGN KEY (operator_id) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 销售 ==========

CREATE TABLE IF NOT EXISTS sales_order (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no        VARCHAR(32)   NOT NULL UNIQUE,
  customer_id     BIGINT        NOT NULL,
  status          VARCHAR(16)   NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/CONFIRMED/SHIPPING/DONE/CANCELLED',
  total_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
  satisfaction    TINYINT       NULL COMMENT '1-5 满意度',
  salesperson_id  BIGINT        NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customer(id),
  CONSTRAINT fk_order_salesperson FOREIGN KEY (salesperson_id) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_order_item (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id    BIGINT        NOT NULL,
  sku_id      BIGINT        NOT NULL,
  quantity    DECIMAL(14,2) NOT NULL,
  unit_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES sales_order(id),
  CONSTRAINT fk_item_sku FOREIGN KEY (sku_id) REFERENCES inventory_sku(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 财务快照（报表用） ==========

CREATE TABLE IF NOT EXISTS finance_monthly (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  year_month      CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
  revenue         DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost            DECIMAL(14,2) NOT NULL DEFAULT 0,
  profit          DECIMAL(14,2) NOT NULL DEFAULT 0,
  asset_value     DECIMAL(14,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_finance_month (year_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
