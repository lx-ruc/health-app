<template>
  <view class="metrics-page">
    <view v-if="metricStore.selectedMetrics.length === 0" class="sheet empty">
      <text class="empty-title">还没有追踪的指标</text>
      <text class="empty-desc">先选择要每天打卡的指标，如血压、血糖、体重</text>
      <button class="btn-primary empty-btn" @tap="goManage">选择指标</button>
    </view>

    <template v-else>
      <view
        v-for="row in rows"
        :key="row.key"
        class="sheet metric-card"
        hover-class="press"
        @tap="goRecord(row.key)"
      >
        <view class="metric-head">
          <view class="metric-title-wrap">
            <text class="metric-name">{{ row.label }}</text>
            <text class="metric-unit">{{ row.unit }}</text>
          </view>
          <view class="metric-value-wrap">
            <text class="num metric-value">{{ row.latest ?? '--' }}</text>
            <text class="metric-arrow">›</text>
          </view>
        </view>

        <view v-if="row.reference" class="band metric-band">
          <view class="band-zone" :style="{ left: row.band.zoneLeft + '%', width: row.band.zoneWidth + '%' }" />
          <view
            v-if="row.latest !== null"
            :class="['band-dot', row.status]"
            :style="{ left: row.band.dotLeft + '%' }"
          />
        </view>

        <view class="metric-meta">
          <text v-if="row.reference" class="meta-text">参考 {{ row.reference }}</text>
          <text v-else class="meta-text">—</text>
          <text class="meta-text meta-delta">{{ row.deltaText }}</text>
        </view>
      </view>

      <button class="btn-quiet manage-btn" @tap="goManage">管理指标</button>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useMetricStore } from '../../stores/metric'
import { hasReference, referenceText, metricStatus, bandGeometry } from '../../utils/metrics'

const metricStore = useMetricStore()

interface MetricRow {
  key: string
  label: string
  unit: string
  latest: number | null
  reference: string | null
  status: string
  band: { zoneLeft: number; zoneWidth: number; dotLeft: number }
  deltaText: string
}

const rows = computed<MetricRow[]>(() =>
  metricStore.selectedMetrics.map((m) => {
    const mine = metricStore.records.filter((r: any) => r.metric_key === m.key)
    const latest = mine.length > 0 ? Number(mine[0].value) : null
    const clinical = hasReference(m.key)
    const status = metricStatus(m.key, latest) ?? 'ok'

    let deltaText = '暂无记录'
    if (mine.length >= 2) {
      const delta = Number(mine[0].value) - Number(mine[1].value)
      const sign = delta > 0 ? '+' : ''
      deltaText = `较上次 ${sign}${Math.round(delta * 100) / 100}`
    } else if (mine.length === 1) {
      deltaText = '首次记录'
    }

    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      latest,
      reference: referenceText(m.key),
      status,
      band: bandGeometry(m.key, latest),
      deltaText,
    }
  }),
)

onMounted(() => {
  metricStore.fetchConfig()
  metricStore.fetchRecords()
})

function goRecord(metricKey: string) {
  uni.navigateTo({ url: `/pages/metrics/record?metricKey=${metricKey}` })
}

function goManage() {
  uni.navigateTo({ url: '/pages/metrics/manage' })
}
</script>

<style scoped>
.metrics-page {
  padding: 24rpx 32rpx 60rpx;
  min-height: 100vh;
}

/* ---- 空态 ---- */
.empty {
  padding: 90rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t1);
}

.empty-desc {
  font-size: 26rpx;
  color: var(--t3);
  margin: 16rpx 0 44rpx;
  text-align: center;
}

.empty-btn {
  width: 320rpx;
}

/* ---- 指标卡 ---- */
.metric-card {
  padding: 30rpx 32rpx 26rpx;
  margin-bottom: 20rpx;
  animation: rise 0.35s ease both;
}

.metric-card:nth-child(2) { animation-delay: 0.05s; }
.metric-card:nth-child(3) { animation-delay: 0.1s; }

.metric-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.metric-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.metric-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
}

.metric-unit {
  font-size: 22rpx;
  color: var(--t3);
}

.metric-value-wrap {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
}

.metric-value {
  font-size: 44rpx;
  font-weight: 600;
  color: var(--ink);
}

.metric-arrow {
  font-size: 30rpx;
  color: var(--t3);
}

.metric-band {
  margin-top: 26rpx;
}

.metric-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 14rpx;
}

.meta-text {
  font-size: 23rpx;
  color: var(--t3);
}

.manage-btn {
  margin-top: 16rpx;
}

@keyframes rise {
  from { transform: translateY(14rpx); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
</style>
