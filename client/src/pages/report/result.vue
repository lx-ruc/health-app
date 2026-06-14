<template>
  <view class="result-page">
    <view class="section">
      <view class="section-header">
        <view class="section-dot" />
        <text class="section-title">OCR 识别结果</text>
      </view>
      <text class="ocr-text" selectable>{{ ocrText }}</text>
    </view>

    <view class="section">
      <view class="section-header">
        <view class="section-dot dot-alert" />
        <text class="section-title">异常指标分析</text>
      </view>
      <view v-if="abnormalItems.length > 0" class="abnormal-list">
        <view v-for="(item, idx) in abnormalItems" :key="idx" class="abnormal-card" @tap="toggleExpand(idx)">
          <view class="card-top">
            <view class="card-indicator" />
            <text class="card-name">{{ item.name }}</text>
            <text class="card-value">{{ item.value }}</text>
            <text class="card-toggle">{{ expanded[idx] ? '收起' : '详情' }}</text>
          </view>
          <view v-if="expanded[idx]" class="card-body">
            <view class="body-row">
              <text class="body-label">参考范围</text>
              <text class="body-val">{{ item.reference }}</text>
            </view>
            <view class="body-row">
              <text class="body-label">偏离程度</text>
              <text class="body-val">{{ item.deviation }}</text>
            </view>
            <view class="body-row">
              <text class="body-label">健康影响</text>
              <text class="body-val">{{ item.impact }}</text>
            </view>
            <view class="body-row highlight">
              <text class="body-label">建议</text>
              <text class="body-val">{{ item.suggestion }}</text>
            </view>
          </view>
        </view>
      </view>
      <text v-else class="raw-analysis" selectable>{{ analysis }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const ocrText = ref('')
const analysis = ref('')
const abnormalItems = ref<any[]>([])
const expanded = ref<Record<number, boolean>>({})

onLoad(() => {
  // 改成从 storage 读，避免 URL 参数过长被截断
  const cached = uni.getStorageSync('last_report_result')
  if (cached) {
    ocrText.value = cached.ocrText || ''
    analysis.value = cached.analysis || ''
    uni.removeStorageSync('last_report_result')
  }
  try {
    const parsed = JSON.parse(analysis.value)
    if (parsed.abnormal) abnormalItems.value = parsed.abnormal
  } catch {}
})

function toggleExpand(idx: number) {
  expanded.value[idx] = !expanded.value[idx]
}
</script>

<style scoped>
.result-page {
  padding: 20rpx 30rpx;
  min-height: 100vh;
  background: #FAF7F2;
}

.section {
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #8B9E7E;
  margin-right: 12rpx;
}

.section-dot.dot-alert {
  background: #C8785C;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2A26;
}

.ocr-text {
  font-size: 26rpx;
  color: #5A5650;
  line-height: 1.7;
  white-space: pre-wrap;
}

.abnormal-card {
  background: #FAF7F2;
  border-radius: 16rpx;
  padding: 22rpx;
  margin-bottom: 14rpx;
  border: 1rpx solid #EDE8DF;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-indicator {
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  background: #C8785C;
}

.card-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #C8785C;
}

.card-value {
  font-size: 26rpx;
  color: #2D2A26;
  font-weight: 500;
}

.card-toggle {
  font-size: 22rpx;
  color: #4A6741;
  padding: 4rpx 14rpx;
  background: rgba(74, 103, 65, 0.1);
  border-radius: 12rpx;
}

.card-body {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #EDE8DF;
}

.body-row {
  display: flex;
  margin-bottom: 10rpx;
}

.body-row:last-child {
  margin-bottom: 0;
}

.body-row.highlight .body-val {
  color: #4A6741;
}

.body-label {
  font-size: 24rpx;
  color: #8B8680;
  min-width: 120rpx;
}

.body-val {
  font-size: 24rpx;
  color: #5A5650;
  flex: 1;
}

.raw-analysis {
  font-size: 26rpx;
  color: #5A5650;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
