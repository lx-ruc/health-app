# 设计：指标趋势图

## Context

数据层已就绪：`metric_records(openid, metric_key, recorded_at)` 带专用索引，`GET /api/metrics/records?metric_key=&days=N` 支持范围查询；`client/src/utils/metrics.ts` 的 `RANGES` 已含 `min/max + scaleMin/scaleMax`，`bandGeometry()` 中的 `pct()` 即 y 轴换算公式。设计系统「袖珍化验单」已有签名元素参考区间带（1-D），本设计将其沿时间轴展开为 2-D。约束：微信小程序 canvas（`type="2d"`）、uni-app Vue3、不新增 npm 依赖、`--cinnabar` 仅用于异常读数、无渐变。

## Goals / Non-Goals

**Goals:**
- 化验单语法的趋势图组件（自绘 canvas），视觉与现有设计系统无缝
- 首页 sparkline（纯 CSS 点阵）消除 `--` 空洞
- 历史页成为「指标趋势中心」（`[习惯|指标]` 分段）
- 稀疏数据下的诚实呈现与分级空状态

**Non-Goals:**
- 习惯 ↔ 指标关联视图（后续 change）
- record 页迷你趋势图
- uCharts / ECharts 等图表库、测试框架
- 平滑曲线、动画、双 y 轴

## Decisions

### D1: 自绘 canvas，不用 uCharts

**替代方案**: uCharts（v1 任务 5.6 原案）——触摸 tooltip 白送、配置式开发，但默认视觉是「通用图表库」（网格、图例、字体），与无网格/状态点色/区间 zone 的化验单语法冲突，主题覆盖成本不低且引入几百 KB 依赖。

**选择自绘的理由**: y 轴几何可直接复用 `pct()`；图表语法完全由设计系统推导（见 D2）；需要的能力（点、细线、矩形 zone、虚线、刻度文字）都是 canvas 基元，预估单图 ~200 行。本质是把签名元素升级为组件，而不是往纸面上贴一张别家的图。

### D2: 图表语法 = 设计系统既有规则的 2-D 推导

```
▲value                              规则来源
│             ●                     ← 朱砂：> max（既有：cinnabar 仅异常）
│    ●      ┊        ●              ← 墨色 2rpx 直线段（不平滑，诚实）
│  ●   ●   ┊   ●   ●               ← 苔绿点：区间内
│          ┊zone┄┄┄┄┄┄             ← band-zone 拉宽（签名元素 2-D 版）
140 ┤ · · ·┊· · · ·· · ·            ← 限值虚线刻度（.num / DIN）
 90 ┤ · · ·┊· · · ·· · ·
    └──┬─────┬─────┬──▶ recorded_at
     8/20  8/27  9/3               ← x 轴按时间连续映射
```

- **无网格线**：化验单没有网格；只有 zone 边界虚线 + 首尾刻度，也更省绘制代码
- **x 轴按 `recorded_at` 连续值映射**（不是按日离散槽位）：同日多次打卡自然分开（v1 spec 已有该场景），首尾刻度标日期
- **无参考区间指标**（体重/步数/自定义）：y 轴按数据 min/max ± 10% padding 自适应，无 zone，点全部苔绿

### D3: 触摸交互 = tap 反查 + HTML 读数行，不做 canvas 内 tooltip 气泡

绘制时记录每个点的画布 x 坐标；`catchtap` 的 `detail.x` 找最近点，emit 给父组件，由图下方 HTML 读数行（`9/1 · 134 mmHg · 偏高` + tag-state）高亮显示。气泡在 canvas 里自绘成本高且字体控制差；读数行用 HTML 天然获得完美排版与 `.num`。未点选时读数行显示「最高/最低/平均」统计行（兑现 v1 spec 的统计标注需求）。

### D4: 渲染分层——首页 CSS 点阵，历史页 canvas

首页「最近指标」行的 sparkline 用绝对定位 `view` 圆点（`left = 日期%`、`top = pct(值)%`），零 canvas、零依赖、任何渲染器可用；**按日聚合取当日最新一条**（行内空间只容 ~14 点）。完整趋势图（需要连续 x 轴、连线、zone、刻度）用 canvas。两处共用 `utils/chart.ts` 的同一套几何函数，只是输出目标是百分比还是像素。

### D5: 数据获取与时间窗

历史页指标段进入时一次拉 `days=35`（不传 `metric_key`，全指标），客户端按 7/14/30 切片，切换零请求。首页复用 metricStore 同一批数据（store 增加 `fetchRecords(35)` 的默认窗口或独立 action）。窗口默认 14 天：7 天对稀疏指标太空，30 天点距过密。

### D6: 空状态分级（产品决策内嵌）

- 0 点：引导文案「在指标页打卡后，这里会出现趋势」
- 1–2 点：绘制散点（无连线）+「再记录 N 次即可看到趋势」（N = 3 − 现有点数）
- ≥3 点：完整趋势（连线 + zone + 统计行）

### D7: `utils/chart.ts` 纯函数几何层

导出 `scaleFor(metricKey, points)`、`toX/toY`、`windowSlice(points, days)`、`stats(points)`、`sparklineDots(points, days)` 等，全部无副作用、不触 UI，为未来补单测预留（项目当前无测试框架，不在本 change 引入）。组件 `TrendChart.vue` 只做「几何 → canvas 指令」的薄层。

### D8: canvas 细节

`<canvas type="2d">` + `uni.createSelectorQuery().node()` 取节点，按 `dpr` 缩放（`canvas.width = cssWidth * dpr`，`ctx.scale(dpr, dpr)`）；字体 `bold 20rpx 'DIN Alternate', 'Helvetica Neue'`（真机无 DIN 时回退，可接受）。组件 props：`points`（升序）、`metricKey`、`height`；emit：`point-tap`。

## Risks / Trade-offs

- [真机 canvas 2d 兼容/闪烁] → 仅在数据与尺寸就绪后绘制一次；`type="2d"` 为官方推荐路径，SDK ≥2.9（项目基线 3.17）
- [稀疏数据被折线「脑补」成连续趋势] → 直线段不平滑；1–2 点不出连线（D6）
- [多指标卡 = 多 canvas 实例的性能] → 历史页指标段每卡固定高度、离屏不绘制；指标数量典型 ≤6，可接受；不虚拟滚动
- [35 天全量拉取体积] → 单用户单指标日均 ≤ 数条，JSON 体积可忽略
- [自绘的长期维护成本 vs uCharts 社区] → 图表语法极简（点/线/矩形/虚线/文字），复杂度有上界；若未来需要高级图表再评估引入库，组件 props 接口保持稳定即可
- [同日多次打卡在 sparkline 聚合丢信息] → sparkline 定位是「形」，完整信息在历史页 canvas（连续 x 轴不聚合）

## Migration Plan

纯前端增量：无 DB schema 变更、无 API 变更、无依赖变更。回滚 = revert 提交。应用完成后将 `health-app-v1` 任务 5.6 勾选并在其旁注明「由 add-metric-trend-charts 取代实现」。

## Open Questions

无——关键决策已在探索阶段与用户确认（2026-09-02 会话：落点=历史页、自绘、默认 14 天、关联视图延后）。
