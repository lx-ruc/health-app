<template>
  <view class="record-page">
    <view class="metric-header">
      <text class="eyebrow">指标打卡</text>
      <text class="metric-title">{{ metricInfo?.label }}</text>
    </view>

    <view class="sheet input-sheet">
      <view class="value-row">
        <input
          class="num value-input"
          type="digit"
          v-model="value"
          :placeholder="`输入${metricInfo?.label || ''}数值`"
          placeholder-class="value-placeholder"
        />
        <text class="value-unit">{{ metricInfo?.unit }}</text>
      </view>

      <template v-if="hasReference">
        <view class="band record-band">
          <view class="band-zone" :style="{ left: geometry.zoneLeft + '%', width: geometry.zoneWidth + '%' }" />
          <view v-if="numValue !== null" :class="['band-dot', status]" :style="{ left: geometry.dotLeft + '%' }" />
        </view>

        <view class="status-row">
          <text class="meta-ref">参考 {{ reference }}</text>
          <text v-if="statusLabel" :class="['tag-state', status === 'normal' ? 'ok' : status === 'high' ? 'bad' : 'todo']">
            {{ status === 'high' ? '↑ ' + statusLabel : status === 'low' ? '↓ ' + statusLabel : statusLabel }}
          </text>
        </view>
      </template>
    </view>

    <view v-if="recentValues.length > 0" class="recent-block">
      <text class="eyebrow recent-eyebrow">最近记录</text>
      <view class="recent-values">
        <text v-for="(v, i) in recentValues" :key="i" class="num recent-item">{{ v }}</text>
      </view>
    </view>

    <button class="btn-primary submit-btn" :loading="saving" @tap="submit">保存记录</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMetricStore } from '../../stores/metric'
import { onLoad } from '@dcloudio/uni-app'
// 注意：工具函数一律别名导入，避免与同名 computed 相互遮蔽
// （曾因 hasReference 同名导致 getter 递归调用自身抛错、整页渲染中断）
import {
  hasReference as metricHasReference,
  referenceText,
  metricStatus,
  bandGeometry,
  statusLabel as labelOf,
} from '../../utils/metrics'

const metricStore = useMetricStore()
const metricKey = ref('')
const value = ref('')
const saving = ref(false)

onLoad(async (query) => {
  metricKey.value = query?.metricKey || ''
  // 兜底：record.vue 经 navigateTo 到达，store 通常已被 index.vue 填充；
  // 但若用户直达该页（如从其他入口跳转），需 fetchConfig 确保自定义指标 label/unit 可用。
  if (metricStore.selectedMetrics.length === 0) {
    await metricStore.fetchConfig()
  }
  metricStore.fetchRecords()
})

const metricInfo = computed(() =>
  metricStore.selectedMetrics.find((m) => m.key === metricKey.value),
)

const hasReference = computed(() => metricHasReference(metricKey.value))
const reference = computed(() => referenceText(metricKey.value))

const numValue = computed(() => {
  const n = Number(value.value)
  return value.value !== '' && !Number.isNaN(n) ? n : null
})

const status = computed(() => metricStatus(metricKey.value, numValue.value))
const statusLabel = computed(() => labelOf(status.value))
const geometry = computed(() => bandGeometry(metricKey.value, numValue.value))

const recentValues = computed(() =>
  metricStore.records
    .filter((r: any) => r.metric_key === metricKey.value)
    .slice(0, 3)
    .map((r: any) => r.value),
)

async function submit() {
  if (!value.value) {
    uni.showToast({ title: '请输入数值', icon: 'none' })
    return
  }

  saving.value = true
  try {
    await metricStore.addRecord(metricKey.value, Number(value.value))
    uni.showToast({ title: '打卡成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.record-page {
  padding: 40rpx 32rpx;
  min-height: 100vh;
}

.metric-header {
  padding: 10rpx 8rpx 34rpx;
}

.metric-title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: var(--ink);
  margin-top: 12rpx;
}

/* ---- 输入主卡 ---- */
.input-sheet {
  padding: 48rpx 36rpx 36rpx;
}

.value-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 16rpx;
}

.value-input {
  font-size: 96rpx;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
  min-width: 260rpx;
  height: 120rpx;
}

.value-placeholder {
  font-size: 34rpx;
  color: var(--t3);
  font-weight: 400;
}

.value-unit {
  font-size: 28rpx;
  color: var(--t3);
}

.record-band {
  margin-top: 56rpx;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22rpx;
}

.meta-ref {
  font-size: 24rpx;
  color: var(--t3);
}

/* ---- 最近记录 ---- */
.recent-block {
  margin-top: 44rpx;
  padding: 0 8rpx;
}

.recent-eyebrow {
  margin-bottom: 16rpx;
}

.recent-values {
  display: flex;
  gap: 20rpx;
}

.recent-item {
  font-size: 30rpx;
  color: var(--t2);
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 14rpx;
  padding: 10rpx 26rpx;
}

.submit-btn {
  margin-top: 72rpx;
}
</style>
