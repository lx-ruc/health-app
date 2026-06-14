## ADDED Requirements

### Requirement: 订阅消息授权
系统 SHALL 提供入口让用户主动授权订阅消息，授权次数可累计。

#### Scenario: 用户主动授权
- **WHEN** 用户在提醒设置页点击「增加提醒次数」按钮
- **THEN** 调用 `wx.requestSubscribeMessage`，弹出微信原生授权弹窗
- **AND** 用户每接受一个模板，后端为该用户的对应配置 `subscribe_remaining` +1

#### Scenario: 用户拒绝授权
- **WHEN** 用户在微信授权弹窗中拒绝
- **THEN** 前端 toast 提示「未授权，无法发送提醒」
- **AND** `subscribe_remaining` 不变

#### Scenario: H5 模式无授权能力
- **WHEN** 用户在 H5 模式下进入提醒设置页
- **THEN** 「增加提醒次数」按钮置灰，提示「请在微信中打开」

### Requirement: 提醒配置管理
系统 SHALL 让用户配置每日打卡提醒和每周指标提醒的时间、频率、开关。

#### Scenario: 首次配置每日打卡
- **WHEN** 用户在提醒设置页开启「每日打卡提醒」并选择时间 23:00
- **THEN** 后端保存配置 `{type:'daily_habit', time:'23:00', enabled:1}`
- **AND** 返回 200，前端显示已开启

#### Scenario: 修改每周指标提醒
- **WHEN** 用户选择每周一、三、五 08:00 收到指标提醒
- **THEN** 后端保存 `{type:'weekly_metric', time:'08:00', days_of_week:'1,3,5', enabled:1}`

#### Scenario: 关闭提醒
- **WHEN** 用户关闭某类提醒开关
- **THEN** 后端把对应配置 `enabled=0`
- **AND** 调度器不再为该用户发推送，但 `subscribe_remaining` 不变

#### Scenario: 读取已有配置
- **WHEN** 用户进入提醒设置页
- **THEN** GET `/api/reminder-config` 返回用户所有提醒配置 + 每类的 `subscribe_remaining`

### Requirement: 后端 access_token 管理
系统 SHALL 缓存微信 access_token 并在过期前自动刷新，避免每次发消息都请求新 token。

#### Scenario: 缓存命中
- **WHEN** 调度任务或推送接口请求 access_token
- **AND** 内存缓存中有未过期 token（剩余有效期 > 5 分钟）
- **THEN** 直接返回缓存 token，不调微信 API

#### Scenario: 缓存过期自动刷新
- **WHEN** 内存缓存的 token 剩余有效期 < 5 分钟，或缓存为空
- **THEN** 系统向 `https://api.weixin.qq.com/cgi-bin/token` 请求新 token
- **AND** 新 token 同时写入内存缓存和 DB（进程重启可恢复）
- **AND** 多个并发请求只触发一次刷新（互斥锁）

#### Scenario: 刷新失败不影响业务
- **WHEN** 微信 token 接口返回错误或网络失败
- **THEN** 当前推送任务记日志并跳过，不抛异常中断调度器
- **AND** 下一次调度任务会再次尝试刷新

### Requirement: 后端定时调度器
系统 SHALL 提供进程内 cron 调度器，按分钟检查需要触发的提醒任务。

#### Scenario: 每分钟扫描
- **WHEN** 调度器每分钟触发（cron `* * * * *`）
- **THEN** 查询 `reminder_configs` 表，找出 `time = 当前 HH:MM` 且 `enabled=1` 且 `subscribe_remaining > 0` 的所有配置
- **AND** 对每条匹配配置异步发送订阅消息

#### Scenario: 每日打卡匹配条件
- **WHEN** 当前时间为 23:00
- **AND** 用户 A 有 `type='daily_habit', time='23:00', enabled=1`
- **THEN** 调度器匹配到该配置，发送每日打卡提醒模板

#### Scenario: 每周指标匹配条件
- **WHEN** 当前时间为周一 08:00
- **AND** 用户 B 有 `type='weekly_metric', time='08:00', days_of_week='1,3,5', enabled=1`
- **THEN** 调度器匹配到该配置，发送每周指标提醒模板

#### Scenario: 剩余次数耗尽停发
- **WHEN** 调度器扫描时发现某配置 `subscribe_remaining = 0`
- **THEN** 跳过该配置不发推送

### Requirement: 订阅消息推送
系统 SHALL 通过微信订阅消息 API 推送提醒，并正确扣减剩余次数。

#### Scenario: 推送成功
- **WHEN** 调度器匹配到一条配置
- **THEN** 后端调用 `https://api.weixin.qq.com/cgi-bin/message/subscribe/send` 发送对应模板
- **AND** 成功后 `subscribe_remaining -1`

#### Scenario: 用户已取消订阅
- **WHEN** 微信返回 errcode=43101（用户拒绝接受消息）
- **THEN** 后端把该用户该类型配置 `subscribe_remaining = 0`
- **AND** 调度器不再为该用户该类型发推送

#### Scenario: access_token 失效自动重试
- **WHEN** 推送 API 返回 errcode=40001（access_token 无效）
- **THEN** 后端强制刷新 access_token
- **AND** 用新 token 重试一次推送
- **AND** 重试仍失败则记日志跳过

### Requirement: 提醒设置页 UI
系统 SHALL 提供独立的提醒设置页，作为用户管理所有提醒的入口。

#### Scenario: 入口位置
- **WHEN** 用户进入「我的」个人资料页
- **THEN** 看到「提醒设置」入口，点击跳转到 `/pages/reminder/index`

#### Scenario: 页面布局
- **WHEN** 用户进入提醒设置页
- **THEN** 看到两个分区：「每日打卡提醒」、「每周指标提醒」
- **AND** 每个分区有开关、时间选择器（每周指标还有星期选择）
- **AND** 顶部显示「剩余提醒次数 X 条」+ 「增加次数」按钮（mp-weixin only）

#### Scenario: 修改即时生效
- **WHEN** 用户切换开关或修改时间
- **THEN** 立即 PUT 后端保存（debounce 500ms）
- **AND** 显示「已保存」短暂提示
