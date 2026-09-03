## 1. 几何纯函数层（utils/chart.ts）

- [x] 1.1 实现 `scaleFor(metricKey, points)`：有参考区间沿用 `RANGES` 的 scaleMin/scaleMax 并返回 zone；无区间按数据 min/max 外扩 ~10% 自适应
- [x] 1.2 实现 `windowSlice(points, days)` 与 `stats(points)`（最高/最低/平均）；`sparklineDots(points, days)` 输出 CSS 点阵所需的 `left/top` 百分比（按日聚合取最新）
- [x] 1.3 `npx tsc --noEmit`（client 侧 `npm run type-check`）通过，纯函数无副作用、不触 UI

## 2. 趋势图组件（TrendChart.vue）

- [x] 2.1 搭建 `<canvas type="2d">` 组件骨架：SelectorQuery 取节点、dpr 缩放、props（points/metricKey/height）与 `point-tap` emit
- [x] 2.2 绘制化验单语法：参考区间 zone + 虚线限值、状态色读数点、墨色直线段、首尾日期刻度（无网格线）；无区间指标走自适应 y 轴分支
- [x] 2.3 实现 tap 反查：绘制时记录各点画布 x 坐标，`catchtap` 定位最近读数并 emit；1–2 点时仅绘散点不连线

## 3. 历史页改造（pages/history/index.vue）

- [x] 3.1 顶部增加「习惯 / 指标」分段切换，习惯段保留现有列表与弹窗行为
- [x] 3.2 metricStore 增加一次性 `days=35` 全指标拉取（复用现有 records 接口），供历史页与首页共用（现有 `fetchRecords(metricKey?, days?)` 签名已覆盖，未改代码）
- [x] 3.3 指标段逐指标渲染趋势卡：指标名/单位/TrendChart/7-14-30 窗口切换（默认 14，客户端切片零请求）
- [x] 3.4 趋势卡读数行：默认显示「最高/最低/平均」统计行，tap 后切换为该读数的「日期 · 数值+单位 · 状态签」

## 4. 空状态与首页 sparkline

- [x] 4.1 趋势卡空状态分级：0 条引导文案、1–2 条散点 +「再记录 N 次即可看到趋势」（N = 3 − 现有条数）
- [x] 4.2 首页「最近指标」行：最新值 + 单位 + 近 14 天 CSS 点阵（`sparklineDots` 驱动，状态点色规则一致）；无记录维持现状占位

## 5. 验证与收尾

- [x] 5.1 weapp-dev-mcp 截图验证：历史页指标段（有区间/无区间/稀疏/空四类指标卡）、首页 sparkline、习惯段回归
- [x] 5.2 真机或模拟器确认 canvas 在 dpr≠1 下清晰、tap 查值准确；`npm run type-check` 通过
- [x] 5.3 将 `health-app-v1` 任务 5.6 勾选并注明「由 add-metric-trend-charts 取代实现（自绘 canvas）」
