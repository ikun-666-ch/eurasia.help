# 陕西省林业苗圃资产与销售系统

陕西省林业苗圃资产与销售系统的数据可视化平台，包含 3D 地图大屏、库存管理、销售管理、财务管理等模块。

## 项目结构

| 模块 | 目录 |
|------|------|
| 前端大屏 | `sc-datav/` |
| 后端 API | `nursery-api/` |
| 地理数据 | `陕西省.geojson` |

## 快速启动

### 前端

```bash
cd sc-datav
npm run dev
```

### 后端

```bash
cd nursery-api
# 配置数据库连接后启动
mvn spring-boot:run
```

## 页面入口

| 页面 | 地址 |
|------|------|
| 登录/注册 | `/#/login` |
| 3D 首页 | `/#/home` |
| 库存大屏 | `/#/inv` |
| 销售大屏 | `/#/sal` |
| 财务大屏 | `/#/fin` |
| 管理后台 | `/#/admin` |
| 所有订单 | `/#/all-orders` |
| 个人中心 | `/#/profile` |

## 技术栈

- **前端**: React + TypeScript + Vite + Three.js + ECharts
- **后端**: Spring Boot + MyBatis + Flyway
