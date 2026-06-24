-- finance_sales_district + finance_city_profile（对齐 PHP FinanceSchema）

CREATE TABLE IF NOT EXISTS finance_sales_district (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  city        VARCHAR(64)   NOT NULL,
  district    VARCHAR(64)   NOT NULL,
  amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  sort_order  INT           NOT NULL DEFAULT 0,
  UNIQUE KEY uk_fin_sales_district (city, district)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS finance_city_profile (
  city                    VARCHAR(64) PRIMARY KEY,
  growth_rate_cumulative  DECIMAL(8,2) NOT NULL DEFAULT 12,
  growth_rate_yoy         DECIMAL(8,2) NOT NULL DEFAULT 18,
  q1_share                DECIMAL(8,2) NOT NULL DEFAULT 30,
  q2_share                DECIMAL(8,2) NOT NULL DEFAULT 25,
  q3_share                DECIMAL(8,2) NOT NULL DEFAULT 25,
  q4_share                DECIMAL(8,2) NOT NULL DEFAULT 20
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO finance_city_profile (city, growth_rate_cumulative, growth_rate_yoy, q1_share, q2_share, q3_share, q4_share) VALUES
('西安市', 15, 22, 28, 26, 24, 22),
('铜川市', 8, 12, 22, 24, 28, 26),
('宝鸡市', 10, 16, 26, 28, 23, 23),
('咸阳市', 11, 17, 32, 22, 26, 20),
('渭南市', 9, 14, 24, 26, 27, 23),
('延安市', 14, 19, 20, 22, 30, 28),
('汉中市', 10, 15, 27, 25, 24, 24),
('榆林市', 18, 24, 35, 28, 20, 17),
('安康市', 7, 11, 23, 27, 26, 24),
('商洛市', 6, 10, 21, 23, 28, 28)
ON DUPLICATE KEY UPDATE city = city;

INSERT INTO nursery_asset_stat (city, label, value, label2, value2, unit, sort_order) VALUES
('西安市', '苗圃地块', 128, '覆盖', 86, '处', 0),
('西安市', '育苗大棚', 45, '在用', 38, '座', 1),
('西安市', '灌溉设施', 210, '正常', 198, '套', 2),
('西安市', '仓储库位', 64, '占用', 51, '个', 3)
ON DUPLICATE KEY UPDATE label = label;
