<template>
  <view class="record-page">
    <view class="record-header">
      <text class="record-title">{{ metricInfo?.label }}</text>
      <text class="record-unit">单位: {{ metricInfo?.unit }}</text>
    </view>

    <view class="input-card">
      <input
        class="value-input"
        type="digit"
        v-model="value"
        :placeholder="`输入数值`"
        placeholder-style="color: #D4CFC7; font-size: 56rpx;"
      />
    </view>

    <view class="submit-area">
      <view class="submit-btn" :class="{ loading: saving }" @tap="submit">
        <text class="submit-text">{{ saving ? '保存中...' : '保存记录' }}</text>
      </view>
    </view>
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

onLoad((query) => { metricKey.value = query?.metricKey || '' })

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
  min-height: 100vh;
  background: #FAF7F2;
}

.record-header {
  margin-bottom: 40rpx;
}

.record-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2D2A26;
  display: block;
}

.record-unit {
  font-size: 26rpx;
  color: #8B8680;
  margin-top: 8rpx;
  display: block;
}

.input-card {
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 48rpx 30rpx;
  margin-bottom: 50rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.value-input {
  font-size: 72rpx;
  font-weight: 700;
  text-align: center;
  color: #4A6741;
  height: 120rpx;
}

.submit-area {
  padding: 0 10rpx;
}

.submit-btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4A6741;
  border-radius: 24rpx;
}

.submit-btn.loading {
  opacity: 0.7;
}

.submit-text {
  font-size: 30rpx;
  color: #FFFDF9;
  font-weight: 600;
  letter-spacing: 1rpx;
}
</style>
