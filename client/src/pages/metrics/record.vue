<template>
  <view class="record-page">
    <view class="record-header">
      <text class="record-title">{{ metricInfo?.label }}</text>
      <text class="record-unit">单位: {{ metricInfo?.unit }}</text>
    </view>

    <view v-if="latest" class="latest-card">
      <text class="latest-label">最近一次</text>
      <view class="latest-row">
        <text class="latest-value">{{ latest.value }}</text>
        <text class="latest-unit">{{ metricInfo?.unit }}</text>
      </view>
      <text class="latest-time">{{ formatTime(latest.recorded_at) }}</text>
    </view>

    <view class="input-card">
      <input
        class="value-input"
        type="digit"
        v-model="value"
        placeholder="输入数值"
        placeholder-style="color: #D4CFC7; font-size: 56rpx;"
      />
    </view>

    <view class="submit-area">
      <view class="submit-btn" :class="{ loading: saving }" @tap="submit">
        <text class="submit-text">{{ saving ? '保存中...' : '保存记录' }}</text>
      </view>
    </view>

    <view class="trend-section">
      <view class="section-header">
        <text class="section-title">近 30 天趋势</text>
        <text class="section-count">{{ chartPoints.length }} 条记录</text>
      </view>
      <view class="trend-card">
        <TrendChart :points="chartPoints" />
      </view>
    </view>

    <view v-if="recent.length > 0" class="recent-section">
      <view class="section-header">
        <text class="section-title">最近记录</text>
      </view>
      <view class="recent-list">
        <view v-for="r in recent" :key="r.id" class="recent-row">
          <text class="recent-date">{{ formatTime(r.recorded_at) }}</text>
          <text class="recent-value">{{ r.value }} {{ metricInfo?.unit }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMetricStore } from '../../stores/metric'
import { METRIC_OPTIONS } from '../../utils/constants'
import { onLoad } from '@dcloudio/uni-app'
import TrendChart from '../../components/TrendChart.vue'

const metricStore = useMetricStore()
const metricKey = ref('')
const value = ref('')
const saving = ref(false)

onLoad(async (query) => {
  metricKey.value = query?.metricKey || ''
  await metricStore.fetchRecords(metricKey.value, 30)
})

const metricInfo = computed(() =>
  METRIC_OPTIONS.find((m) => m.key === metricKey.value),
)

interface Record {
  id: number
  metric_key: string
  value: number
  recorded_at: string
}

const sortedAsc = computed(() =>
  [...metricStore.records].sort(
    (a: Record, b: Record) => +new Date(a.recorded_at) - +new Date(b.recorded_at),
  ),
)

const latest = computed<Record | null>(() => {
  if (sortedAsc.value.length === 0) return null
  return sortedAsc.value[sortedAsc.value.length - 1]
})

const chartPoints = computed(() =>
  sortedAsc.value.map((r: Record) => ({
    date: r.recorded_at,
    value: r.value,
  })),
)

const recent = computed(() => [...sortedAsc.value].reverse().slice(0, 7))

function formatTime(s: string): string {
  if (!s) return ''
  return s.replace('T', ' ').slice(0, 16)
}

async function submit() {
  if (!value.value) {
    uni.showToast({ title: '请输入数值', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await metricStore.addRecord(metricKey.value, Number(value.value))
    uni.showToast({ title: '打卡成功', icon: 'success' })
    value.value = ''
    await metricStore.fetchRecords(metricKey.value, 30)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.record-page {
  padding: 40rpx 30rpx;
  min-height: 100vh;
  background: #faf7f2;
}

.record-header {
  margin-bottom: 32rpx;
}

.record-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2d2a26;
  display: block;
}

.record-unit {
  font-size: 26rpx;
  color: #8b8680;
  margin-top: 8rpx;
  display: block;
}

.latest-card {
  background: #fffdf9;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.latest-label {
  font-size: 24rpx;
  color: #8b8680;
  display: block;
  margin-bottom: 8rpx;
}

.latest-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.latest-value {
  font-size: 56rpx;
  font-weight: 700;
  color: #4a6741;
}

.latest-unit {
  font-size: 24rpx;
  color: #8b8680;
}

.latest-time {
  font-size: 22rpx;
  color: #b6b1a8;
  margin-top: 8rpx;
  display: block;
}

.input-card {
  background: #fffdf9;
  border-radius: 24rpx;
  padding: 32rpx 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.value-input {
  font-size: 56rpx;
  font-weight: 700;
  text-align: center;
  color: #4a6741;
  height: 100rpx;
}

.submit-area {
  padding: 0 10rpx;
  margin-bottom: 32rpx;
}

.submit-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a6741;
  border-radius: 24rpx;
}

.submit-btn.loading {
  opacity: 0.7;
}

.submit-text {
  font-size: 30rpx;
  color: #fffdf9;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 8rpx 4rpx 16rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #8b8680;
  letter-spacing: 1rpx;
}

.section-count {
  font-size: 22rpx;
  color: #b6b1a8;
}

.trend-section {
  margin-bottom: 32rpx;
}

.trend-card {
  background: #fffdf9;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.recent-section {
  margin-bottom: 60rpx;
}

.recent-list {
  background: #fffdf9;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.recent-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0ebe2;
}

.recent-row:last-child {
  border-bottom: none;
}

.recent-date {
  font-size: 26rpx;
  color: #6b6660;
}

.recent-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
}
</style>
