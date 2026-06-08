<template>
  <view class="record-page">
    <view class="metric-header">
      <text class="metric-title">{{ metricInfo?.label }}</text>
      <text class="metric-unit">单位: {{ metricInfo?.unit }}</text>
    </view>

    <view class="input-section">
      <input
        class="value-input"
        type="digit"
        v-model="value"
        :placeholder="`输入${metricInfo?.label}数值`"
      />
    </view>

    <button class="submit-btn" :loading="saving" @tap="submit">保存记录</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMetricStore } from '../../stores/metric'
import { METRIC_OPTIONS } from '../../utils/constants'
import { onLoad } from '@dcloudio/uni-app'

const metricStore = useMetricStore()
const metricKey = ref('')
const value = ref('')
const saving = ref(false)

onLoad((query) => {
  metricKey.value = query?.metricKey || ''
})

const metricInfo = computed(() =>
  METRIC_OPTIONS.find((m) => m.key === metricKey.value),
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
  padding: 40rpx 30rpx;
}

.metric-header {
  margin-bottom: 40rpx;
}

.metric-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.metric-unit {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.input-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;
}

.value-input {
  font-size: 48rpx;
  font-weight: 600;
  text-align: center;
  height: 100rpx;
}

.submit-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: #07C160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
}
</style>
