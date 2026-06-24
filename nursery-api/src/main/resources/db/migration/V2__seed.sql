INSERT INTO sys_role (id, code, name, permissions) VALUES
(1, 'ADMIN',     '系统管理员', '用户·权限·品类·客户·系统配置'),
(2, 'INVENTORY', '库存管理员', '入库·出库·盘点·库存调整'),
(3, 'SALES',     '销售员',     '订单·客户跟进·订单状态'),
(4, 'FINANCE',   '财务人员',   '报表·资产统计·利润分析');

INSERT INTO seedling_category (id, parent_id, name, level, sort_order) VALUES
(1, NULL, '乔木类', 1, 1),
(2, NULL, '灌木类', 1, 2),
(3, NULL, '地被类', 1, 3),
(4, NULL, '容器苗', 1, 4),
(11, 1, '国槐', 2, 1),
(12, 1, '银杏', 2, 2),
(13, 1, '白皮松', 2, 3),
(21, 2, '紫叶李', 2, 1),
(22, 2, '连翘', 2, 2);

INSERT INTO customer (name, contact_name, region, level, phone) VALUES
('西安园林绿化局', '刘主任', '西安市', 'A', '029-88880001'),
('宝鸡市政建设公司', '陈经理', '宝鸡市', 'B', '0917-88880002'),
('榆林生态林场', '马场长', '榆林市', 'A', '0912-88880003'),
('汉中苗木合作社', '周社长', '汉中市', 'B', '0916-88880004');

INSERT INTO inventory_sku (variety, specification, category_id) VALUES
('国槐', '胸径8cm', 11),
('国槐', '胸径10cm', 11),
('银杏', '胸径10cm', 12),
('银杏', 'H1.5m', 12),
('白皮松', 'H1.5m', 13),
('白皮松', '容器苗', 13),
('紫叶李', '容器苗', 21),
('连翘', '胸径8cm', 22);

INSERT INTO finance_monthly (`year_month`, revenue, cost, profit, asset_value) VALUES
('2025-01', 320000.00, 210000.00, 110000.00, 1580000.00),
('2025-02', 280000.00, 185000.00, 95000.00, 1620000.00),
('2025-03', 350000.00, 220000.00, 130000.00, 1680000.00),
('2025-04', 410000.00, 255000.00, 155000.00, 1750000.00),
('2025-05', 390000.00, 248000.00, 142000.00, 1810000.00),
('2025-06', 420000.00, 260000.00, 160000.00, 1880000.00);

INSERT INTO finance_settings (id, growth_rate_cumulative, growth_rate_yoy, q1_share, q2_share, q3_share, q4_share)
VALUES (1, 12, 18, 30, 25, 25, 20);
