# 指标趋势图（add-metric-trend-charts）

## Why

这个 app 的核心承诺是「习惯 ↔ 指标的关联」，但目前所有指标数据只以最新值和文字形式存在——全 app 没有一张图。首页「最近指标」行长期显示 `--` 单值，历史页是纯文字列表加 `showModal` 弹窗，与「袖珍化验单」设计语言的完成度严重不匹配。`health-app-v1` 的任务 5.6 早已规划趋势图但未实施，且数据地基（`metric_records` 三列索引、`?days=` 范围查询、`RANGES` 刻度系统）已全部就绪。

## What Changes

- 新增**自绘 canvas 趋势图组件**：化验单图表语法——参考区间横向展开为 shaded zone、出界读数用朱砂/琥珀状态点、连线用墨色细线、无网格线、DIN 刻度数字；支持 tap 反查最近读数并在图下方 HTML 读数行高亮
- 新增 `utils/chart.ts` 纯函数几何模块：复用 `RANGES` 的 `pct()` 换算；无参考区间指标（体重、自定义）按数据 min/max 自适应 y 轴
- **首页**「最近指标」行：展示最新值 + 近 14 天纯 CSS 点阵 sparkline（绝对定位 view 圆点，零 canvas、零依赖）
- **历史页改造**：顶部 `[习惯|指标]` 分段切换；指标段为每个已选指标渲染一张趋势卡，卡内含 7/14/30 天窗口切换（默认 14，一次拉取 35 天客户端切片）与「最高/最低/平均」统计行；习惯段保留现有列表
- **空状态分级**：0 点显示引导文案；1–2 点显示散点 + 「再记录 N 次即可看到趋势」；≥3 点渲染完整趋势
- **取代** `health-app-v1` 任务 5.6 的 uCharts 方案（改为自绘，理由见 design.md）

## Capabilities

### New Capabilities
- `metric-trend-charts`: 指标历史趋势的可视化呈现——趋势图组件、首页 sparkline、历史页指标趋势视图、时间窗切换、空状态分级与触摸查值

### Modified Capabilities
<!-- openspec/specs/ 尚无已归档 spec（health-app-v1 未 archive），无需 delta -->

## Impact

- **client 新增**: `components/TrendChart.vue`（自绘 canvas）、`utils/chart.ts`（纯函数几何）
- **client 修改**: `pages/index/index.vue`（最近指标行）、`pages/history/index.vue`（分段改造）、`stores/metric.ts`（按 35 天窗口拉取记录）
- **server**: 无改动（`GET /api/metrics/records?days=N` 已支持范围查询）
- **依赖**: 不新增 npm 包（不引入 uCharts）
- **关联变更**: `health-app-v1` 任务 5.6 由本 change 取代（应用本 change 时将其关闭）；v1 spec 中「指标趋势展示」需求在本 change specs 中细化为可验证场景
- **Non-goals**: 习惯 ↔ 指标关联视图（睡眠时长跨午夜换算 + 双图对齐，留待后续 change 复用本组件）；record 页迷你趋势；引入测试框架（几何纯函数为未来补测预留）
