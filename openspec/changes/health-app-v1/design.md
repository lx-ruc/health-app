## Context

全新项目，无现有代码。目标是一个微信小程序，帮助用户记录生活习惯并通过 AI 分析习惯与疾病的关联。前端 uni-app (Vue 3 + TS)，后端 Node (Fastify)，数据库 SQLite。

约束条件：
- 微信小程序环境，不能用浏览器专属 API（localStorage → 用 uni.setStorageSync）
- 两个外部 AI 服务均通过后端代理，前端不持有 API Key
- 第一版以功能完整为主，不考虑高并发、多端扩展

## Goals / Non-Goals

**Goals:**
- 微信小程序端可用，核心功能闭环（录入 → 打卡 → AI 分析 → 报告识别）
- 前后端分离，API 清晰可测试
- 用户数据持久化，本地缓存 + 远端同步
- AI 对话体验流畅，支持多轮追问

**Non-Goals:**
- 不做 iOS/Android/H5 多端适配（仅微信小程序）
- 不做社交功能（好友、分享、排行榜）
- 不做推送通知
- 不做国际化
- 不做后台管理面板

## Decisions

### 1. 项目结构：Monorepo 单仓

```
health_work/
├── client/          # uni-app 前端 (Vue 3 + TS + Pinia)
│   ├── src/
│   │   ├── pages/           # 页面
│   │   ├── components/      # 组件
│   │   ├── composables/     # 组合式函数
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── api/             # 后端 API 封装
│   │   ├── utils/           # 工具函数
│   │   └── static/          # 静态资源
│   ├── manifest.json
│   ├── pages.json
│   └── package.json
├── server/          # Node 后端 (Fastify)
│   ├── src/
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务逻辑
│   │   ├── db/              # SQLite 操作
│   │   ├── middleware/      # JWT 认证中间件
│   │   └── index.ts         # 入口
│   └── package.json
├── openspec/
└── CLAUDE.md
```

**理由**: 前后端紧密关联，单仓管理方便共享类型定义和 API 契约。相比独立仓库减少协调成本。

### 2. 前端状态管理：Pinia + StorageSync 双层

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Pinia Store │────▶│  StorageSync │────▶│   后端 API   │
│  (内存响应式)  │◀────│  (本地持久化)  │◀────│  (云端同步)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

- Pinia 管理运行时状态（响应式、computed）
- StorageSync 做本地持久化（离线可用）
- 后端 API 做云端同步（登录后自动同步）

**理由**: 小程序可能随时被杀进程，StorageSync 保证数据不丢；Pinia 保证 UI 流畅。

### 3. 后端框架：Fastify

**替代方案**: Express（生态更大但性能差）、Koa（轻量但中间件零散）

**理由**: 性能好，TypeScript 支持好，插件体系清晰，JSON Schema 校验内置。

### 4. 数据库：SQLite（better-sqlite3）

**替代方案**: PostgreSQL（第一版过重）、MongoDB（文档型不适合时间序列查询）

**理由**: 零运维，单文件，better-sqlite3 同步 API 简单。第一版数据量小完全够用。如果后续需要迁移，用 SQL 共性语法可平滑过渡到 PostgreSQL。

### 5. 认证：微信静默登录 + JWT

```
┌────────────┐  wx.login()   ┌────────────┐  code + appSecret   ┌────────────┐
│   小程序前端  │─────────────▶│  后端 /auth │───────────────────▶│  微信服务器  │
│             │◀─────────────│  /login     │◀───────────────────│             │
│             │   JWT token  │             │   openid            │             │
└────────────┘               └────────────┘                     └────────────┘
```

- 前端调 `wx.login()` 获取 `code`
- 后端用 `code` + `AppID` + `AppSecret` 换 `openid`
- 后端签发 JWT（payload: `{ openid }`，有效期 7 天）
- 前端每次请求带 `Authorization: Bearer <token>`

**理由**: 用户无感知，无需注册流程。JWT 无状态，第一版不需要 Redis 存 session。

### 6. AI 对话：无状态模式

```
每次请求拼接:
┌─────────────────────────────────┐
│ System Prompt:                  │
│   "你是健康顾问..."              │
│   + 用户画像 (年龄/体重/病史)    │
│   + 最近7天习惯摘要              │
│   + 最近7天指标趋势              │
├─────────────────────────────────┤
│ Messages:                       │
│   用户历史消息 (最近10轮)        │
│   + AI 历史回复 (最近10轮)       │
│   + 当前用户新消息               │
└─────────────────────────────────┘
```

**替代方案**: 有状态会话（后端存对话历史），更省 token 但需要额外的会话管理表。

**理由**: 用户画像+习惯数据量小（<2K token），无状态架构简单，不需要会话管理。对话历史存前端，每次请求带最近 10 轮。DeepSeek context window 128K 完全够用。

### 7. OCR 流程：图片 base64 → 后端 → SiliconFlow

```
┌────────────┐  上传图片(base64)  ┌────────────┐  OCR请求   ┌──────────────┐
│   前端      │─────────────────▶│  后端 /api  │──────────▶│  SiliconFlow │
│            │◀─────────────────│  /ocr       │◀──────────│  PaddleOCR   │
│            │  识别结果         │             │  文字结果   │              │
└────────────┘               └──────┬───────┘             └──────────────┘
                                    │
                                    ▼  识别结果 → DeepSeek 分析异常指标
                               ┌────────────┐
                               │  DeepSeek  │
                               └────────────┘
```

**理由**: 前端转 base64 上传，后端代理调 SiliconFlow，再调 DeepSeek 做结构化分析（提取异常指标、建议）。两步合一，前端只需一次请求。

### 8. 前端页面路由

```
pages.json
├── pages/index/index              # 首页（今日概览 + 快捷打卡）
├── pages/onboarding/index         # 引导录入（首次进入）
├── pages/habit/index              # 习惯录入
├──/pages/metrics/index            # 指标打卡列表
├── pages/metrics/record           # 指标记录录入
├── pages/analysis/index           # AI 对话分析
├── pages/report/index             # 体检报告上传
├── pages/report/result            # 报告分析结果
├── pages/profile/index            # 个人资料（修改基本信息）
└── pages/history/index            # 历史数据查看
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite 并发写入 | 单用户场景无影响，但 WAL 模式下仍需注意 | better-sqlite3 同步 API 天然避免竞态；单实例部署足够 |
| 无状态 AI 对话 token 消耗 | 每次请求都带用户画像，多轮对话累积 | 限制对话轮数为 10 轮；用户画像精简为摘要 |
| 微信小程序包体积 | uni-app + 组件库可能超 2MB | 分包加载；UI 组件手写不用第三方库 |
| API Key 安全 | 后端代理解决，但后端本身需要安全 | 后端部署在内网或使用环境变量；不在代码中硬编码 |
| DeepSeek API 不稳定 | 对话分析功能不可用 | 加超时+重试；降级提示"请稍后再试" |

## Open Questions

- 微信小程序 AppID 是否已申请？需要提前注册
- 后端部署在哪里？（云服务器 / 微信云托管 / 本地开发先行）
- 体检报告 OCR 是否需要支持 PDF？还是只支持图片？
