# 指标趋势图（5.6）Design

## 目标
让用户在指标详情页看到自己最近 30 天的数据走势，理解"打卡"的长期意义。

## 已定决策（与用户对齐）
- **图表实现**：纯 SVG（无新依赖）。复用 `utils/icons.ts` 已验证的 data URL + `<image>` 模式。
- **页面位置**：改造 `pages/metrics/record.vue` 为「指标详情页」——输入 + 趋势 + 最近记录同页。
- **时间范围**：固定 30 天。

## 架构

### 新增组件：`client/src/components/TrendChart.vue`
- Props:
  - `points: { date: string; value: number }[]`（按日期升序）
  - `color?: string`（默认 `#4A6741`）
- 输出：`<image :src="dataUrl">`，宽 100%，高 320rpx
- 内部 `buildSvg(points)` 纯函数：返回 SVG 字符串
- 边界情况：
  - 0 个点：渲染空状态文字
  - 1 个点：渲染单个圆点（中间）
  - 所有值相同：min === max 时，pad ±1，画水平线居中

### 改造：`pages/metrics/record.vue`
布局（上至下）：
1. Header：指标名 + 单位（保留）
2. **最新值卡片**（新）：大数字 + "最近更新 X 天前"
3. 输入区 + 保存按钮（保留）
4. **30 天趋势图**（新）：标题 "近 30 天趋势" + TrendChart
5. **最近 7 条记录**（新）：日期 + 数值列表

### 数据流
- `onLoad(metricKey)` → `metricStore.fetchRecords(metricKey, 30)`
- store 已有 `fetchRecords(metricKey, days)`，后端已支持 `?metricKey=&days=`
- 保存成功后：refetch + chart 自动刷新

## 视觉规格

| 元素 | 规格 |
|---|---|
| 容器 | `#FFFDF9` 圆角 24rpx，padding 28rpx |
| 折线 | `color` 默认 `#4A6741`，stroke 4rpx，圆角连接 |
| 数据点 | 圆 r=3，与折线同色 |
| Y 参考线 | 3 条横向（max/mid/min），`#EDE8DF` 1rpx dashed |
| Y 标签 | 左侧 max/mid/min 数值，`#8B8680` 22rpx |
| X 标签 | 底部首/中/尾 3 个日期，`#8B8680` 22rpx |
| 高度 | 320rpx |

### Y 轴缩放算法
- `min = Math.min(...values)`，`max = Math.max(...values)`
- pad = (max - min) × 0.1，若 (max - min) === 0 则 pad = Math.max(1, |value| × 0.1)
- 显示范围：[min - pad, max + pad]

## 测试
- H5：playwright 进入 `/pages/metrics/record?metricKey=weight`，截图验证渲染、无 console error
- mp-weixin：`npm run build:mp-weixin`，无编译警告
- 类型：`vue-tsc --noEmit` 通过
- 数据准备：测试前先 POST 几条 weight 记录确保有点可画

## 不做（YAGNI）
- 不做交互 tooltip（tap 点查数值）
- 不做时间范围切换
- 不做多指标对比
- 不做 sparkline 列表（v1 收尾，YAGNI）
