## Why

v1 是被动记录工具——用户主动打开小程序才能打卡。但「养成健康习惯」的关键不是记录，而是**按时记录 + 按时执行**。当前缺少主动督促，用户容易忘记打卡，记录数据断断续续，AI 分析的可靠性也跟着打折。v2 引入提醒系统，把 app 从「被动记录」升级为「主动陪伴」。

## What Changes

**基础设施**
- 微信订阅消息授权流程：用户在小程序内一次性授权，后端记录授权状态
- 后端 access_token 管理：自动缓存 + 提前刷新，避免每次发消息都拉新 token
- 后端调度器：node-cron 风格，按分钟/小时/天/周触发任务

**用户配置**
- 提醒设置页：开关、提醒时间、提醒频率（每周几）
- 后端 `/api/reminder-config` GET/PUT

**两类提醒场景（首版）**
- **每日打卡提醒**：用户配置时间（如 23:00），推送订阅消息提醒记录今日习惯（睡眠/饮食/运动）
- **每周指标提醒**：用户配置每周几 + 时间（如周一 08:00），推送订阅消息提醒记录指标（体重/血压/血糖）

**不在本版做（留给后续 change）**
- 漏卡提醒（事件驱动 + 当日状态检查）
- AI 驱动提醒（需要周期性 AI 分析）

## Capabilities

### New Capabilities
- `reminders`: 提醒系统——订阅消息授权、access_token 管理、调度器、每日/每周定时提醒、用户配置

### Modified Capabilities
（无）

## Impact

**后端**
- 新增 `server/src/services/wechat-token.ts`：access_token 缓存 + 刷新
- 新增 `server/src/services/subscribe-message.ts`：封装微信订阅消息发送
- 新增 `server/src/scheduler/index.ts`：cron 调度器入口
- 新增 `server/src/scheduler/jobs/daily-habit-reminder.ts`
- 新增 `server/src/scheduler/jobs/weekly-metric-reminder.ts`
- 新增 `server/src/routes/reminder-config.ts`：用户配置 GET/PUT
- DB schema 新增 `reminder_configs` 表（openid + 类型 + 时间 + 开关 + 周几 + 订阅消息模板 ID）
- DB schema 新增 `wechat_access_tokens` 缓存表（或内存缓存）

**前端**
- 新增 `client/src/pages/reminder/index.vue`：提醒设置页
- 入口在 `profile/index.vue` 加「提醒设置」
- 新增订阅消息授权封装 `client/src/utils/subscribe.ts`

**微信平台配置**
- mp.weixin.qq.com 后台「订阅消息」里申请 2 个模板：每日打卡 / 每周指标
- 把模板 ID 配置到 `server/.env`

**新依赖**
- `node-cron`（后端调度）

**外部 API**
- `https://api.weixin.qq.com/cgi-bin/token`（拿 access_token）
- `https://api.weixin.qq.com/cgi-bin/message/subscribe/send`（发订阅消息）

**测试**
- H5 测不了订阅消息授权（mp-weixin only），E2E 需要真机
- 后端调度逻辑可以单元测试（mock 时间）
- access_token 缓存逻辑可以单元测试
