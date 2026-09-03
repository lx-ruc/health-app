<template>
  <view class="result-page">
    <view v-if="loading" class="state-block">
      <text class="state-text">报告加载中…</text>
    </view>

    <view v-else-if="errorMsg" class="state-block">
      <text class="state-text error">{{ errorMsg }}</text>
    </view>

    <template v-else>
      <view class="sheet section">
        <text class="eyebrow section-eyebrow">识别结果</text>
        <text class="ocr-text" selectable>{{ ocrText }}</text>
      </view>

      <view class="sheet section">
        <text class="eyebrow section-eyebrow">异常指标</text>
        <view v-if="abnormalItems.length > 0" class="abnormal-list">
          <view
            v-for="(item, idx) in abnormalItems"
            :key="idx"
            class="abnormal-card"
            hover-class="press"
            @tap="toggleExpand(idx)"
          >
            <view class="card-header">
              <text class="card-name">{{ item.name }}</text>
              <text class="num card-value">{{ item.value }}</text>
              <text class="card-expand">{{ expanded[idx] ? '收起' : '展开' }}</text>
            </view>
            <view v-if="expanded[idx]" class="card-detail">
              <view class="detail-row">
                <text class="detail-label">参考范围</text>
                <text class="detail-content">{{ item.reference }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-label">偏离程度</text>
                <text class="detail-content">{{ item.deviation }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-label">健康影响</text>
                <text class="detail-content">{{ item.impact }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-label">建议</text>
                <text class="detail-content advice">{{ item.suggestion }}</text>
              </view>
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
  padding: 24rpx 32rpx 60rpx;
  min-height: 100vh;
}

.section {
  padding: 30rpx 32rpx;
  margin-bottom: 24rpx;
}

.section-eyebrow {
  margin-bottom: 20rpx;
}

.ocr-text {
  font-size: 26rpx;
  color: var(--t2);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* ---- 异常指标卡：化验单语言 ---- */
.abnormal-card {
  border: 1rpx solid var(--line);
  border-left: 6rpx solid var(--cinnabar);
  border-radius: 16rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 18rpx;
}

.card-header {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--cinnabar);
  flex: 1;
}

.card-value {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--t1);
}

.card-expand {
  font-size: 24rpx;
  color: var(--t3);
}

.card-detail {
  margin-top: 22rpx;
  padding-top: 22rpx;
  border-top: 1rpx dashed var(--line);
}

.detail-row {
  display: flex;
  margin-bottom: 14rpx;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  width: 150rpx;
  flex-shrink: 0;
  font-size: 25rpx;
  color: var(--t3);
}

.detail-content {
  flex: 1;
  font-size: 25rpx;
  color: var(--t2);
  line-height: 1.7;
}

.detail-content.advice {
  color: var(--ink);
}

.raw-analysis {
  font-size: 26rpx;
  color: var(--t2);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* ---- 状态 ---- */
.state-block {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.state-text {
  color: var(--t3);
  font-size: 28rpx;
}

.state-text.error {
  color: var(--cinnabar);
}
</style>
