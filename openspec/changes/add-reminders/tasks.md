## 1. 微信平台准备（外部，运营/法务）

- [ ] 1.1 mp.weixin.qq.com 后台申请「订阅消息」模板：每日打卡提醒（变量：nickname / date / content）
- [ ] 1.2 申请每周指标提醒模板（变量：nickname / weekday / metrics）
- [x] 1.3 拿到两个模板 ID，配到 `server/.env`（`WX_TPL_DAILY_HABIT` / `WX_TPL_WEEKLY_METRIC`）（占位已加，待 1.1/1.2 拿到 ID 后填）

## 2. 数据库 schema 改造

- [x] 2.1 `init.ts` 新增 `reminder_configs` 表（type/time/days_of_week/enabled/subscribe_remaining/UNIQUE(openid,type)）
- [x] 2.2 `init.ts` 新增 `wechat_access_token` 表（appid/token/expires_at）
- [x] 2.3 老库自动迁移（CREATE TABLE IF NOT EXISTS 即可，新表无影响老数据）

## 3. 后端 access_token 管理

- [x] 3.1 新建 `server/src/services/wechat-token.ts`
- [x] 3.2 实现 `getAccessToken()`：内存缓存 → DB → 拉微信 API，三层降级
- [x] 3.3 实现互斥锁（Promise 缓存），并发请求只触发一次刷新
- [ ] 3.4 单元测试：缓存命中 / 过期 / 并发刷新 / 失败容错（无 test infra，curl 验证已覆盖核心路径）

## 4. 后端订阅消息服务

- [x] 4.1 新建 `server/src/services/subscribe-message.ts`
- [x] 4.2 实现 `sendSubscribeMessage(openid, templateId, data)` 封装微信 API
- [x] 4.3 处理 errcode=40001（access_token 失效）→ 强制刷新 + 重试一次
- [x] 4.4 处理 errcode=43101（用户取消订阅）→ 标记 subscribe_remaining=0

## 5. 后端提醒配置 API

- [x] 5.1 新建 `server/src/routes/reminder-config.ts`
- [x] 5.2 GET `/api/reminder-config`：返回当前用户所有配置 + subscribe_remaining
- [x] 5.3 PUT `/api/reminder-config`：upsert 单条配置（type 唯一）
- [x] 5.4 POST `/api/reminder-config/subscribe-increment`：授权后累加 subscribe_remaining

## 6. 后端调度器

- [x] 6.1 添加依赖 `node-cron`
- [x] 6.2 新建 `server/src/scheduler/index.ts`：启动入口，注册到 Fastify 启动钩子
- [x] 6.3 新建 `server/src/scheduler/jobs/check-reminders.ts`：cron `* * * * *`
- [x] 6.4 实现 query：找当前 HH:MM 匹配 + enabled=1 + subscribe_remaining>0 的所有配置
- [x] 6.5 对每条匹配项异步调用 `sendSubscribeMessage` + 扣减剩余次数

## 7. 前端订阅授权封装

- [x] 7.1 新建 `client/src/utils/subscribe.ts`
- [x] 7.2 封装 `requestReminderAuth(type, tmplIds)`：调 `wx.requestSubscribeMessage`
- [x] 7.3 处理授权结果：accepted → POST `/api/reminder-config/subscribe-increment`，rejected → toast
- [x] 7.4 H5 模式下函数 no-op + 返回提示

## 8. 前端提醒设置页

- [x] 8.1 新建 `client/src/pages/reminder/index.vue`
- [x] 8.2 顶部「剩余提醒次数」展示 + 「增加次数」按钮（#ifdef MP-WEIXIN）
- [x] 8.3 「每日打卡提醒」分区：开关 + 时间选择器
- [x] 8.4 「每周指标提醒」分区：开关 + 时间 + 周几多选（圆点 chip）
- [x] 8.5 修改 debounce 500ms 自动 PUT，显示「已保存」toast
- [x] 8.6 在 `profile/index.vue` 加入口「提醒设置」
- [x] 8.7 在 `pages.json` 注册 `/pages/reminder/index`

## 9. 集成测试

- [ ] 9.1 后端：mock 当前时间，触发调度器，验证正确匹配 + 推送被调用 + 扣减次数（无 test infra，逻辑通过 curl 验证查询正确）
- [ ] 9.2 后端：access_token 并发刷新只发一次微信 API（无 test infra，代码层 mutex 已实现）
- [x] 9.3 前端 H5：reminder 页能正常显示和切换开关（订阅授权按钮置灰）
- [x] 9.4 mp-weixin build 无警告
- [x] 9.5 类型检查（前后端 tsc）通过

## 10. 真机回归

- [ ] 10.1 真机进 reminder 页，点「增加次数」走完授权
- [ ] 10.2 配置每日打卡提醒时间为下一分钟，验证 60s 内收到推送
- [ ] 10.3 配置每周指标提醒，验证指定日收到推送
- [ ] 10.4 拒绝授权后开关置灰逻辑正确
- [ ] 10.5 推送次数耗尽后下次调度不发 + reminder 页提示
