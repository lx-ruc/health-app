## Context

v1 完成后，app 是一个被动记录工具。用户主动打开才能打卡，数据连续性差。微信小程序的订阅消息是「主动触达用户」的合规手段：用户一次性授权，后端可多次推送（每个模板的次数受限于用户的授权次数）。

**当前相关代码**：
- 后端已有 `auth/login` 持久化 openid 和 session_key（v1 接入微信步数时加的）
- 用户表已有 openid 主键
- 没有定时任务，没有 access_token 管理

**外部约束**：
- 微信订阅消息：每次用户授权一次只能发一条；用户可累计多次授权
- access_token 有效期 2 小时，每天拉取次数有限（默认 2000 次/天），必须缓存
- 真机才能完整测；H5 / 开发者工具的 `wx.requestSubscribeMessage` 可调但实际推送不可达

## Goals / Non-Goals

**Goals**：
- 用户能在小程序内一键开启/关闭提醒
- 每天固定时间收到打卡提醒
- 每周指定日收到指标提醒
- 后端调度器和微信 API 调用稳定，不重复发、不漏发
- access_token 缓存命中率 > 99%，单次刷新失败不影响业务

**Non-Goals**：
- 不做漏卡提醒（当日状态检查，事件驱动，留给下一 change）
- 不做 AI 驱动提醒（个性化文案，需要周期性 AI 调用，留给下一 change）
- 不做服务号模板消息（订阅消息够用，服务号要走另外的资质）
- 不做后台运营界面（用户配置直接 CRUD，不做管理员视图）

## Decisions

### 1. access_token 缓存：内存 + DB 双层

**选择**：内存缓存为主（Node 进程级 Map），DB 做兜底（进程重启后能恢复）。
**原因**：纯内存丢失重启即失效，每次冷启动要重新拉 token；纯 DB 每次读有 SQLite I/O 开销。
**替代方案**：纯内存（重启丢）、纯 DB（慢）、Redis（项目没装，过度工程）。

实现：`getToken()` 先看内存，过期或为空再去 DB 看，都没有才向微信拉新。新 token 同时写内存和 DB。

### 2. 调度器：node-cron

**选择**：`node-cron` 包，进程内调度。
**原因**：单实例部署够用，无需分布式调度。cron 表达式熟悉、稳定。
**替代方案**：
- `node-schedule`：API 类似，差异不大
- 系统级 cron：要外部配置，部署复杂
- bullmq + Redis：分布式才需要，过度工程

**注意**：单进程意味着不能水平扩展。如果未来多实例，需要加分布式锁或换 Redis 队列。**当前规模单进程够用，不预先优化**。

### 3. 提醒频率：分钟级 cron + 用户态过滤

**选择**：调度器每分钟跑一次 `check-and-send` 任务，任务内部读 DB 找当前时间匹配的用户配置。
**原因**：每用户独立 cron 不现实（百万用户场景）。统一调度 + DB 过滤扩展性好。
**替代方案**：每个用户配置一条 cron 表达式（不支持，node-cron 不支持动态注册百万级任务）。

具体：每分钟跑 `* * * * *`，查询 `WHERE time = current_time AND (type='daily' OR (type='weekly' AND day_of_week = current_day))`，对每条匹配记录发一条订阅消息。

### 4. 订阅消息授权：UI 入口引导 + 累计授权

**选择**：用户每次进提醒设置页时，主动点「增加提醒次数」按钮，调 `wx.requestSubscribeMessage` 一次性授权 N 次。
**原因**：微信限制——用户授权一次只能发一条。多次授权可累计（如授权 7 次 = 一周）。不能「自动续授权」，必须用户主动点击。
**实现**：
- 前端按钮触发 `wx.requestSubscribeMessage({ tmplIds: [...] })`
- 微信返回 `{ templateId: 'accept' | 'reject' }`
- 前端把 accept 的累计次数 POST 给后端
- 后端记录剩余可用次数，每次发消息 -1，到 0 不再发并通知前端

### 5. 数据模型

```sql
CREATE TABLE reminder_configs (
  id INTEGER PRIMARY KEY,
  openid TEXT NOT NULL,
  type TEXT NOT NULL,         -- 'daily_habit' | 'weekly_metric'
  time TEXT NOT NULL,         -- 'HH:MM' 24h
  day_of_week INTEGER,        -- 0-6 (周日-周六)，weekly_metric 用
  enabled INTEGER DEFAULT 1,
  subscribe_remaining INTEGER DEFAULT 0,  -- 剩余可推送次数
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(openid, type)        -- 每用户每类型一条配置
);

CREATE TABLE wechat_access_token (
  id INTEGER PRIMARY KEY,
  appid TEXT UNIQUE,
  token TEXT,
  expires_at TEXT
);
```

### 6. 推送失败容错

- access_token 失效：捕获 → 强制刷新 → 重试一次
- 用户取消订阅：微信返回 errcode（如 43101），后端把该用户 `subscribe_remaining` 置 0 并停发
- 网络失败：记录日志，不重试（避免重复推送）

## Risks / Trade-offs

- **[订阅消息次数用尽用户感知差]** → 每次推送扣减时，若 remaining ≤ 1，下次推送附带「请重新授权」引导；前端 reminder 页显示剩余次数
- **[access_token 接口被刷爆]** → 内存 + DB 双层缓存，刷新有锁（防止并发重复刷新）；单进程锁够用
- **[调度器进程崩了所有提醒停摆]** → 当前没有监控，建议 v2.2 加健康检查；目前靠 PM2/systemd 自动重启
- **[时区问题]** → 服务器时区必须 `Asia/Shanghai`，cron 用本地时间，文档/部署 checklist 注明
- **[用户卸载或长期不打开]** → 微信订阅消息有效期 7 天（用户不打开消息卡片），过期自动失效；后端不主动检测，靠发送失败时降级处理

## Migration Plan

1. 加 `reminder_configs` 和 `wechat_access_token` 表（init.ts 自动迁移，对老库 ALTER）
2. 部署前在 mp.weixin.qq.com 后台申请 2 个订阅消息模板（每日打卡 / 每周指标），把模板 ID 配到 `server/.env`
3. 部署后端（含 scheduler 自动启动）
4. 用户进小程序 → 提醒设置页 → 授权订阅消息 → 配置时间 → 立即生效

**回滚**：删除 `reminder_configs` 表、移除 scheduler 启动代码即可。订阅消息授权状态用户侧保留但不发推送，无副作用。

## Open Questions

- **模板消息文案**：每个提醒场景的具体文案需要在微信后台审核时确定，这里先用占位。
- **多指标合并**：每周指标提醒是一个模板发一条总消息，还是每个指标各一条？默认合并（一条消息列出所有该记的指标），减少打扰。
