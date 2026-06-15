<template>
  <view class="result-page">
    <view v-if="loading" class="loading">
      <text>报告加载中...</text>
    </view>

    <view v-else-if="errorMsg" class="error">
      <text>{{ errorMsg }}</text>
    </view>

    <template v-else>
      <view class="section">
        <text class="section-title">OCR 识别结果</text>
        <text class="ocr-text" selectable>{{ ocrText }}</text>
      </view>

      <view class="section">
        <text class="section-title">异常指标分析</text>
        <view v-if="abnormalItems.length > 0" class="abnormal-list">
          <view v-for="(item, idx) in abnormalItems" :key="idx" class="abnormal-card" @tap="toggleExpand(idx)">
            <view class="card-header">
              <text class="card-name">{{ item.name }}</text>
              <text class="card-value">{{ item.value }}</text>
              <text class="card-expand">{{ expanded[idx] ? '收起' : '展开' }}</text>
            </view>
            <view v-if="expanded[idx]" class="card-detail">
              <text class="detail-row">参考范围: {{ item.reference }}</text>
              <text class="detail-row">偏离程度: {{ item.deviation }}</text>
              <text class="detail-row">健康影响: {{ item.impact }}</text>
              <text class="detail-row suggestion">建议: {{ item.suggestion }}</text>
            </view>
          </view>
        </view>
        <text v-else class="raw-analysis" selectable>{{ analysis }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get } from '../../api'

const ocrText = ref('')
const analysis = ref('')
const abnormalItems = ref<any[]>([])
const expanded = ref<Record<number, boolean>>({})
const loading = ref(true)
const errorMsg = ref('')

onLoad(async (query) => {
  const id = query?.id
  if (!id) {
    errorMsg.value = '缺少报告ID'
    loading.value = false
    return
  }

  try {
    const data = await get<{ ocrText: string; analysis: string }>(`/report/${id}`)
    ocrText.value = data.ocrText || ''
    analysis.value = data.analysis || ''

    try {
      const parsed = JSON.parse(analysis.value)
      if (parsed.abnormal) {
        abnormalItems.value = parsed.abnormal
      }
    } catch {
      // analysis is not JSON, show raw text
    }
  } catch (err: any) {
    errorMsg.value = err.message || '加载报告失败'
  } finally {
    loading.value = false
  }
})

function toggleExpand(idx: number) {
  expanded.value[idx] = !expanded.value[idx]
}
</script>

<style scoped>
.result-page {
  padding: 20rpx 30rpx;
  min-height: 100vh;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.ocr-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.abnormal-card {
  border: 1rpx solid #f0f0f0;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #e53935;
  flex: 1;
}

.card-value {
  font-size: 28rpx;
  color: #333;
}

.card-expand {
  font-size: 24rpx;
  color: #07C160;
}

.card-detail {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.detail-row {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}

.detail-row.suggestion {
  color: #07C160;
}

.raw-analysis {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.loading,
.error {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.error {
  color: #e53935;
}
</style>
