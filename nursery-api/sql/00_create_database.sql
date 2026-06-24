-- 本机 MySQL 首次使用前执行（命令行或 Navicat / phpMyAdmin）
CREATE DATABASE IF NOT EXISTS nursery_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 可选：单独建用户（不用 root 时）
-- CREATE USER IF NOT EXISTS 'nursery'@'localhost' IDENTIFIED BY '你的密码';
-- GRANT ALL PRIVILEGES ON nursery_db.* TO 'nursery'@'localhost';
-- FLUSH PRIVILEGES;
