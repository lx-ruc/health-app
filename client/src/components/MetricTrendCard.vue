<template>
  <view class="sheet trend-card">
    <view class="card-head">
      <view class="card-title-wrap">
        <text class="card-title">{{ metric.label }}</text>
        <text class="card-unit">{{ metric.unit }}</text>
      </view>
      <view v-if="sliced.length > 0" class="win-switch">
        <text
          v-for="d in WINDOWS"
          :key="d"
          :class="['win-item', 'num', windowDays === d && 'active']"
          @tap="setWindow(d)"
        >{{ d }}天</text>
      </view>
    </view>

    <!-- 空状态分级：0 条 → 引导 -->
    <view v-if="sliced.length === 0" class="card-empty">
      <text class="empty-main">还没有{{ metric.label }}记录</text>
      <text class="empty-sub">在「指标」页打卡后，这里会出现趋势</text>
    </view>

    <template v-else>
      <TrendChart :points="sliced" :metric-key="metric.key" @point-tap="onPointTap" />

      <!-- 空状态分级：1–2 条 → 散点 + 提示 -->
      <view v-if="sliced.length < 3" class="card-hint">
        <text class="hint-text">再记录 {{ 3 - sliced.length }} 次即可看到趋势</text>
      </view>

      <!-- 读数行：未点选 = 统计行（最高/最低/平均）；点选 = 单读数 -->
      <view v-else class="readout">
        <template v-if="selected">
          <text class="num readout-date">{{ selected.day }}</text>
          <view class="readout-value-wrap">
            <text class="num readout-value">{{ fmt(selected.value) }}</text>
            <text class="readout-unit">{{ metric.unit }}</text>
          </view>
          <text v-if="selected.tagLabel" :class="['tag-state', selected.tagClass]">
            {{ selected.tagLabel }}
          </text>
        </template>
        <template v-else>
          <view v-for="s in statItems" :key="s.key" class="stat">
            <text class="stat-k">{{ s.key }}</text>
            <text class="num stat-v">{{ fmt(s.value) }}</text>
          </view>
        </template>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 指标趋势卡：窗口切换（7/14/30，客户端切片零请求）+ TrendChart + 读数行 + 空状态分级。
 * 数据切片与统计均来自 utils/chart.ts 纯函数。
 */
import { ref, computed } from 'vue'
import TrendChart from './TrendChart.vue'
import { windowSlice, stats, formatDay } from '../utils/chart'
import type { ChartPoint } from '../utils/chart'
import { metricStatus, statusLabel, statusArrow } from '../utils/metrics'
import type { MetricItem } from '../utils/constants'

const WINDOWS = [7, 14, 30] as const

const props = defineProps<{
  metric: MetricItem
  points: ChartPoint[]
}>()

const windowDays = ref<number>(14)

const sliced = computed(() => windowSlice(props.points, windowDays.value))

const statItems = computed(() => {
  const s = stats(sliced.value)
  return [
    { key: '最高', value: s.max },
    { key: '最低', value: s.min },
    { key: '平均', value: s.avg },
  ]
})

interface SelectedReadout {
  day: string
  value: number
  tagLabel: string
  tagClass: string
}

const selected = ref<SelectedReadout | null>(null)

function setWindow(days: number): void {
  windowDays.value = days
  selected.value = null
}

function onPointTap(payload: { index: number; point: ChartPoint }): void {
  const status = metricStatus(props.metric.key, payload.point.value)
  selected.value = {
    day: formatDay(payload.point.ts),
    value: payload.point.value,
    tagLabel: statusArrow(status) + statusLabel(status),
    tagClass: status === 'normal' ? 'ok' : status === 'high' ? 'bad' : 'todo',
  }
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
</script>

<style scoped>
.trend-card {
  padding: 28rpx 32rpx;
  margin-bottom: 20rpx;
}

/* ---- 卡头：指标名 + 窗口切换 ---- */
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
}

.card-unit {
  font-size: 22rpx;
  color: var(--t3);
}

.win-switch {
  display: flex;
  background: var(--paper);
  border-radius: 999rpx;
  padding: 4rpx;
}

.win-item {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: var(--t3);
}

.win-item.active {
  background: var(--card);
  color: var(--ink);
  font-weight: 600;
}

/* ---- 空状态 ---- */
.card-empty {
  padding: 44rpx 0 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-main {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--t1);
}

.empty-sub {
  font-size: 24rpx;
  color: var(--t3);
  margin-top: 12rpx;
}

.card-hint {
  margin-top: 18rpx;
  text-align: center;
}

.hint-text {
  font-size: 24rpx;
  color: var(--t3);
}

/* ---- 读数行 ---- */
.readout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--line);
}

.readout-date {
  font-size: 26rpx;
  color: var(--t2);
}

.readout-value-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.readout-value {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--ink);
}

.readout-unit {
  font-size: 22rpx;
  color: var(--t3);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  flex: 1;
}

.stat-k {
  font-size: 22rpx;
  color: var(--t3);
}

.stat-v {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--ink);
}
</style>
