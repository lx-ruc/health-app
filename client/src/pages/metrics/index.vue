<template>
  <view class="metrics-page">
    <view v-if="metricStore.selectedMetrics.length === 0" class="empty">
      <text class="empty-text">还未选择追踪指标</text>
      <button class="setup-btn" @tap="goSetup">选择指标</button>
    </view>
    <view v-else class="metric-list">
      <view v-for="metric in activeMetrics" :key="metric.key" class="metric-card" @tap="goRecord(metric.key)">
        <view class="metric-info">
          <text class="metric-name">{{ metric.label }}</text>
          <text class="metric-unit">{{ metric.unit }}</text>
        </view>
        <view class="metric-latest">
          <text class="latest-value">{{ getLatest(metric.key) || '--' }}</text>
        </view>
        <text class="metric-arrow">></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMetricStore } from '../../stores/metric'
import { METRIC_OPTIONS } from '../../utils/constants'

const metricStore = useMetricStore()

onMounted(() => {
  metricStore.fetchConfig()
  metricStore.fetchRecords()
})

const activeMetrics = computed(() =>
  METRIC_OPTIONS.filter((m) => metricStore.selectedMetrics.includes(m.key)),
)

function getLatest(key: string): string {
  const record = metricStore.records.find((r: any) => r.metric_key === key)
  return record ? String(record.value) : ''
}

function goRecord(metricKey: string) {
  uni.navigateTo({ url: `/pages/metrics/record?metricKey=${metricKey}` })
}

function goSetup() {
  uni.showActionSheet({
    itemList: METRIC_OPTIONS.map((m) => m.label),
    success: (res) => {
      const key = METRIC_OPTIONS[res.tapIndex].key
      const newMetrics = [...new Set([...metricStore.selectedMetrics, key])]
      metricStore.saveConfig(newMetrics)
    },
  })
}
</script>

<style scoped>
.metrics-page {
  padding: 20rpx 30rpx;
  min-height: 100vh;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
  margin-bottom: 30rpx;
}

.setup-btn {
  background: #07C160;
  color: #fff;
  font-size: 28rpx;
  padding: 16rpx 40rpx;
  border-radius: 12rpx;
}

.metric-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}

.metric-info {
  flex: 1;
}

.metric-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.metric-unit {
  font-size: 24rpx;
  color: #999;
  margin-left: 10rpx;
}

.latest-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #07C160;
}

.metric-arrow {
  color: #ccc;
  margin-left: 16rpx;
}
</style>
