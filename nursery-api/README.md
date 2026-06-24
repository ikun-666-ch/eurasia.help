# nursery-api

陕西省林业苗圃资产与销售系统 — 后端 API（Spring Boot 3 + MySQL）

## 技术栈

- Java 17
- Spring Boot 3.3
- Spring Security + JWT
- Spring Data JPA
- MySQL 8

## 本机 MySQL 配置（推荐）

### 1. 安装并启动 MySQL

Mac 可用 Homebrew：

```bash
brew install mysql
brew services start mysql
```

或用宝塔 / MySQL 官方安装包，确保 **3306 端口** 可连。

### 2. 创建数据库

```bash
mysql -u root -p < sql/00_create_database.sql
```

或在 MySQL 客户端里执行 `sql/00_create_database.sql`。

### 3. 配置账号密码

任选一种方式：

**方式 A：环境变量（推荐）**

```bash
export DB_USER=root
export DB_PASSWORD=你的密码
```

**方式 B：本地覆盖文件**

```bash
cp src/main/resources/application-local.override.yml.example \
   src/main/resources/application-local.override.yml
# 编辑 application-local.override.yml 填入密码
```

### 4. 启动后端

```bash
cd nursery-api
mvn spring-boot:run
```

默认 profile 为 `local`，连接本机 MySQL `nursery_db`。  
首次启动会自动 **建表**（`ddl-auto: update`）并写入演示数据。

- 健康检查：`http://127.0.0.1:8080/api/health`
- 登录：`POST http://127.0.0.1:8080/api/auth/login`

```json
{ "username": "admin", "password": "123456" }
```

### 演示账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 系统管理员 |
| inventory1 | 123456 | 库存管理员 |
| sales1 | 123456 | 销售员 |
| finance1 | 123456 | 财务人员 |

### 可选：不用 MySQL，临时用 H2 内存库

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local-h2
```

H2 控制台：`http://127.0.0.1:8080/api/h2-console`，JDBC URL：`jdbc:h2:mem:nursery_db`

---

## 宝塔 + MySQL 部署（生产）

### 1. 宝塔安装 MySQL，创建数据库

- 数据库名：`nursery_db`
- 字符集：`utf8mb4`
- 创建用户并授权

### 2. 导入 SQL（可选）

1. `sql/01_schema.sql` — 建表
2. `sql/02_seed.sql` — 演示业务数据

若已用 JPA 建表，可只导入 `02_seed.sql` 或依赖应用启动时的 DataInitializer。

### 3. 打包并运行

```bash
mvn clean package -DskipTests
java -jar target/nursery-api-0.1.0.jar --spring.profiles.active=prod \
  --DB_HOST=127.0.0.1 \
  --DB_PORT=3306 \
  --DB_NAME=nursery_db \
  --DB_USER=nursery \
  --DB_PASSWORD=你的密码
```

### 4. 宝塔 Nginx 反向代理

将 `/api/` 代理到 `http://127.0.0.1:8080/api/`

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/auth/login` | 登录获取 JWT |
| GET | `/admin/dashboard/kpi` | 管理台 KPI |
| GET | `/admin/users` | 用户列表 |
| GET | `/admin/roles` | 角色列表 |
| GET | `/admin/categories` | 苗木品类树 |
| GET | `/admin/customers` | 客户列表 |
| GET | `/inventory/ledger` | 库存明细 |
| GET | `/finance/summary` | 财务汇总 |

除 `/health`、`/auth/login` 外，请求头需带：

```
Authorization: Bearer <token>
```

## 目录结构

```
nursery-api/
├── sql/                 # MySQL 脚本
├── src/main/java/       # Java 源码
└── src/main/resources/  # application.yml 配置
```
