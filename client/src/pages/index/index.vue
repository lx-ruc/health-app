<template>
  <view class="home">
    <view class="masthead">
      <text class="eyebrow">{{ today }}</text>
      <text class="masthead-title">今日健康</text>
    </view>

    <!-- 今日打卡：印章双栏 -->
    <view class="sheet hero">
      <view class="hero-head">
        <text class="hero-title">今日打卡</text>
        <text class="num hero-count">{{ doneCount }}/2</text>
      </view>
      <view class="hero-cols">
        <view class="hero-col" hover-class="press" @tap="goHabit">
          <view class="stamp" :class="{ done: habitDone }">
            <text v-if="habitDone" class="stamp-check">✓</text>
          </view>
          <text class="hero-name">习惯</text>
          <text :class="['hero-state', habitDone ? 'ok' : 'todo']">
            {{ habitDone ? '已录入' : '未录入' }}
          </text>
        </view>
        <view class="hero-divider" />
        <view class="hero-col" hover-class="press" @tap="goMetrics">
          <view class="stamp" :class="{ done: metricDone, pop2: true }">
            <text v-if="metricDone" class="stamp-check">✓</text>
          </view>
          <text class="hero-name">指标</text>
          <text :class="['hero-state', metricDone ? 'ok' : 'todo']">
            {{ metricDone ? '已打卡' : '未打卡' }}
          </text>
        </view>
      </view>
      <view v-if="habitDone && habitStore.todayHabit" class="hero-note">
        <text class="note-text">睡眠 {{ habitStore.todayHabit.sleep_time || '-' }} ~ {{ habitStore.todayHabit.wake_time || '-' }}</text>
      </view>
    </view>

    <!-- 最近指标 -->
    <view v-if="metricStore.selectedMetrics.length > 0" class="sheet recent">
      <view class="section-head">
        <text class="section-title">最近指标</text>
        <text class="section-link" @tap="goMetrics">全部 ›</text>
      </view>
      <view
        v-for="metric in topMetrics"
        :key="metric.key"
        class="recent-row"
        hover-class="press"
        @tap="goMetrics"
      >
        <text class="recent-label">{{ metric.label }}</text>
        <view class="recent-value-wrap">
          <view v-if="metric.dots.length > 0" class="spark">
            <view
              v-for="(dot, i) in metric.dots"
              :key="i"
              :class="['spark-dot', dot.status ?? 'normal']"
              :style="{ left: dot.left, top: dot.top }"
            />
          </view>
          <text class="num recent-value">{{ metric.latest ?? '--' }}</text>
          <text class="recent-unit">{{ metric.unit }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="sheet links">
      <view class="link-cell" hover-class="press" @tap="goAnalysis">
        <text class="link-name">AI 分析</text>
        <text class="link-desc">问生活习惯与指标的关系</text>
      </view>
      <view class="link-cell" hover-class="press" @tap="goReport">
        <text class="link-name">体检报告</text>
        <text class="link-desc">拍照识别并解读报告</text>
      </view>
      <view class="link-cell" hover-class="press" @tap="goHistory">
        <text class="link-name">历史记录</text>
        <text class="link-desc">回看每一天的习惯</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useHabitStore } from '../../stores/habit'
import { useMetricStore } from '../../stores/metric'
import { toChinaDateStr } from '../../utils/date'
import { toPoints, sparklineDots } from '../../utils/chart'

const habitStore = useHabitStore()
const metricStore = useMetricStore()

const today = toChinaDateStr()

const habitDone = computed(() => !!habitStore.todayHabit)

/** 近 24 小时内有任意指标记录即视为今日已打卡（recorded_at 为 UTC） */
const metricDone = computed(() => {
  const latest = metricStore.records[0]
  if (!latest?.recorded_at) return false
  const t = new Date(latest.recorded_at.replace(' ', 'T') + 'Z').getTime()
  return Date.now() - t < 24 * 3600 * 1000
})

const doneCount = computed(() => Number(habitDone.value) + Number(metricDone.value))

/** 最近指标行：最新值 + 近 14 天 CSS 点阵（无记录维持现状占位） */
const topMetrics = computed(() =>
  metricStore.selectedMetrics.slice(0, 3).map((m) => {
    const points = toPoints(metricStore.records, m.key)
    return {
      ...m,
      latest: points.length > 0 ? points[points.length - 1].value : null,
      dots: sparklineDots(points, m.key),
    }
  }),
)

onMounted(() => {
  habitStore.fetchToday()
  metricStore.fetchConfig()
  metricStore.fetchRecords()
})

function goHabit() { uni.switchTab({ url: '/pages/habit/index' }) }
function goMetrics() { uni.switchTab({ url: '/pages/metrics/index' }) }
function goAnalysis() { uni.switchTab({ url: '/pages/analysis/index' }) }
function goReport() { uni.navigateTo({ url: '/pages/report/index' }) }
function goHistory() { uni.navigateTo({ url: '/pages/history/index' }) }
</script>

<style scoped>
.home {
  padding: 30rpx 32rpx 60rpx;
  min-height: 100vh;
}

/* ---- 报头 ---- */
.masthead {
  padding: 14rpx 8rpx 30rpx;
}

.masthead-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--ink);
  margin-top: 10rpx;
  letter-spacing: 2rpx;
}

/* ---- 今日打卡 ---- */
.hero {
  padding: 32rpx;
  animation: rise 0.4s ease both;
}

.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 28rpx;
}

.hero-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
}

.hero-count {
  font-size: 30rpx;
  color: var(--t3);
}

.hero-cols {
  display: flex;
  align-items: stretch;
}

.hero-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0 4rpx;
}

.hero-divider {
  width: 1rpx;
  background: var(--line);
  margin: 8rpx 0;
}

/* 未盖之章：虚线空圈表示待打卡，盖后变实心苔绿 + 白勾 */
.stamp {
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  border: 3rpx dashed var(--t3);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: stamp-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.stamp.pop2 {
  animation-delay: 0.12s;
}

.stamp.done {
  border-style: solid;
  border-color: var(--moss);
  background: var(--moss);
}

.stamp-check {
  font-size: 48rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.hero-name {
  font-size: 28rpx;
  color: var(--t1);
  margin-top: 16rpx;
  font-weight: 500;
}

.hero-state {
  font-size: 24rpx;
  margin-top: 8rpx;
}

.hero-state.ok   { color: var(--moss); }
.hero-state.todo { color: var(--amber); }

.hero-note {
  margin-top: 24rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid var(--line);
}

.note-text {
  font-size: 25rpx;
  color: var(--t2);
}

/* ---- 最近指标 ---- */
.recent {
  margin-top: 24rpx;
  padding: 8rpx 32rpx;
  animation: rise 0.4s ease 0.06s both;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0 6rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
}

.section-link {
  font-size: 25rpx;
  color: var(--t3);
}

.recent-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.recent-row:last-child {
  border-bottom: none;
}

.recent-label {
  font-size: 28rpx;
  color: var(--t1);
}

.recent-value-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

/* 近 14 天点阵缩略趋势：绝对定位圆点，零 canvas */
.spark {
  position: relative;
  width: 128rpx;
  height: 36rpx;
  margin-right: 16rpx;
}

.spark-dot {
  position: absolute;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  border: 2rpx solid #FFFFFF;
  box-sizing: border-box;
  transform: translate(-50%, -50%);
}

.spark-dot.normal { background: var(--moss); }
.spark-dot.high   { background: var(--cinnabar); }
.spark-dot.low    { background: var(--amber); }

.recent-value {
  font-size: 38rpx;
  font-weight: 600;
  color: var(--ink);
}

.recent-unit {
  font-size: 22rpx;
  color: var(--t3);
}

/* ---- 快捷入口 ---- */
.links {
  margin-top: 24rpx;
  padding: 8rpx 32rpx;
  animation: rise 0.4s ease 0.12s both;
}

.link-cell {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.link-cell:last-child {
  border-bottom: none;
}

.link-name {
  font-size: 29rpx;
  font-weight: 600;
  color: var(--t1);
  width: 172rpx;
}

.link-desc {
  flex: 1;
  font-size: 25rpx;
  color: var(--t3);
  text-align: right;
}

@keyframes stamp-in {
  from { transform: scale(0.55); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

@keyframes rise {
  from { transform: translateY(16rpx); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
</style>
