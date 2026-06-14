<template>
  <view class="metrics-page">
    <!-- Metrics tracking -->
    <view v-if="metricStore.selectedMetrics.length === 0" class="empty">
      <view class="empty-icon-wrap">
        <image class="icon-svg-lg" :src="getIcon('heart', '#C8785C')" mode="aspectFit" />
      </view>
      <text class="empty-title">开始追踪你的健康指标</text>
      <text class="empty-desc">选择想要记录的指标，持续追踪变化趋势</text>
      <view class="empty-btn" hover-class="empty-btn-hover" @tap="goSetup">
        <text class="empty-btn-text">选择指标</text>
      </view>
    </view>

    <view v-else class="metric-list">
      <!-- #ifdef MP-WEIXIN -->
      <view v-if="hasSteps" class="sync-card" :class="{ syncing: syncing }" @tap="syncSteps">
        <view class="sync-icon-wrap">
          <image class="icon-svg" :src="getIcon('sparkle', '#4A6741')" mode="aspectFit" />
        </view>
        <view class="sync-body">
          <text class="sync-name">{{ syncing ? '同步中...' : '同步微信步数' }}</text>
          <text class="sync-desc">一键拉取最近 30 天步数</text>
        </view>
        <text class="sync-arrow">›</text>
      </view>
      <!-- #endif -->

      <view v-for="metric in activeMetrics" :key="metric.key" class="metric-card" @tap="goRecord(metric.key)">
        <view class="metric-left">
          <text class="metric-name">{{ metric.label }}</text>
          <text class="metric-unit">{{ metric.unit }}</text>
        </view>
        <view class="metric-right">
          <text class="metric-value">{{ getLatest(metric.key) || '--' }}</text>
          <text class="metric-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- Health tools section -->
    <view class="tools-section">
      <view class="section-header">
        <view class="section-dot" />
        <text class="section-title">健康工具</text>
      </view>

      <view class="tool-card" @tap="goAnalysis">
        <view class="tool-icon-wrap wrap-ai">
          <image class="icon-svg" :src="getIcon('sparkle')" mode="aspectFit" />
        </view>
        <view class="tool-body">
          <text class="tool-name">AI 健康分析</text>
          <text class="tool-desc">基于你的数据，获取个性化建议</text>
        </view>
        <text class="tool-arrow">›</text>
      </view>

      <view class="tool-card" @tap="goReport">
        <view class="tool-icon-wrap wrap-report">
          <image class="icon-svg" :src="getIcon('fileText', '#C8785C')" mode="aspectFit" />
        </view>
        <view class="tool-body">
          <text class="tool-name">体检报告</text>
          <text class="tool-desc">上传报告，AI 识别异常指标</text>
        </view>
        <text class="tool-arrow">›</text>
      </view>

      <view class="tool-card" @tap="goHistory">
        <view class="tool-icon-wrap wrap-history">
          <image class="icon-svg" :src="getIcon('calendar', '#6B7E9A')" mode="aspectFit" />
        </view>
        <view class="tool-body">
          <text class="tool-name">历史数据</text>
          <text class="tool-desc">查看过往的生活记录</text>
        </view>
        <text class="tool-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMetricStore } from '../../stores/metric'
import { METRIC_OPTIONS } from '../../utils/constants'
import { getIcon } from '../../utils/icons'
import { post, doLogin } from '../../api'

const metricStore = useMetricStore()
const syncing = ref(false)

onMounted(() => {
  metricStore.fetchConfig()
  metricStore.fetchRecords()
})

const activeMetrics = computed(() =>
  METRIC_OPTIONS.filter((m) => metricStore.selectedMetrics.includes(m.key)),
)

const hasSteps = computed(() => metricStore.selectedMetrics.includes('steps'))

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
    fail: (err) => {
      // 用户主动取消时 errMsg 包含 'cancel'，不算错
      if (err?.errMsg?.includes('cancel')) return
      uni.showToast({ title: '打开选择失败', icon: 'none' })
    },
  })
}

// #ifdef MP-WEIXIN
async function syncSteps() {
  if (syncing.value) return
  syncing.value = true
  try {
    await ensureWerunAuth()
    const werun = await new Promise<any>((resolve, reject) => {
      uni.getWeRunData({ success: resolve, fail: reject })
    })
    await postWerunWithRetry({ encryptedData: werun.encryptedData, iv: werun.iv })
    uni.showToast({ title: '同步成功', icon: 'success' })
    await metricStore.fetchRecords('steps', 30)
  } catch (e: any) {
    if (e?.errMsg?.includes('auth deny') || e?.errMsg?.includes('cancel')) return
    uni.showToast({ title: '同步失败，请重试', icon: 'none' })
  } finally {
    syncing.value = false
  }
}

async function ensureWerunAuth(): Promise<void> {
  const setting = await new Promise<any>((resolve, reject) => {
    uni.getSetting({ success: resolve, fail: reject })
  })
  if (setting.authSetting['scope.werun']) return
  try {
    await new Promise<void>((resolve, reject) => {
      uni.authorize({ scope: 'scope.werun', success: resolve, fail: reject })
    })
  } catch {
    await new Promise<void>((resolve) => {
      uni.showModal({
        title: '需要授权微信运动',
        content: '同步步数需要授权微信运动数据，前往设置开启？',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            uni.openSetting({ success: () => resolve(), fail: () => resolve() })
          } else {
            resolve()
          }
        },
        fail: () => resolve(),
      })
    })
    throw new Error('auth required')
  }
}

async function postWerunWithRetry(body: { encryptedData: string; iv: string }, retried = false): Promise<any> {
  try {
    return await post('/wechat/werun', body)
  } catch (e: any) {
    if (!retried && e?.message?.includes('HTTP 440')) {
      await doLogin()
      return postWerunWithRetry(body, true)
    }
    throw e
  }
}
// #endif

function goAnalysis() { uni.switchTab({ url: '/pages/analysis/index' }) }
function goReport() { uni.navigateTo({ url: '/pages/report/index' }) }
function goHistory() { uni.navigateTo({ url: '/pages/history/index' }) }
</script>

<style scoped>
.metrics-page { padding: 20rpx 30rpx; min-height: 100vh; background: #FAF7F2; }

.empty { display: flex; flex-direction: column; align-items: center; padding-top: 120rpx; }
.empty-icon-wrap { width: 120rpx; height: 120rpx; border-radius: 36rpx; background: rgba(200,120,92,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 30rpx; }
.icon-svg-lg { width: 44rpx; height: 44rpx; }
.empty-title { font-size: 32rpx; font-weight: 600; color: #2D2A26; margin-bottom: 10rpx; }
.empty-desc { font-size: 26rpx; color: #8B8680; margin-bottom: 40rpx; }
.empty-btn { background: #4A6741; padding: 20rpx 60rpx; border-radius: 24rpx; }
.empty-btn-hover { background: #3d5635; opacity: 0.9; }
.empty-btn-text { font-size: 28rpx; color: #FFFDF9; font-weight: 500; }

.metric-list { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 20rpx; }
.metric-card { display: flex; align-items: center; background: #FFFDF9; border-radius: 24rpx; padding: 32rpx 28rpx; box-shadow: 0 2rpx 12rpx rgba(45,42,38,0.04); }
.metric-left { flex: 1; }
.metric-name { font-size: 30rpx; color: #2D2A26; font-weight: 600; }
.metric-unit { font-size: 22rpx; color: #8B8680; margin-left: 8rpx; }
.metric-right { display: flex; align-items: center; gap: 8rpx; }
.metric-value { font-size: 38rpx; font-weight: 700; color: #4A6741; }
.metric-arrow { font-size: 32rpx; color: #D4CFC7; }

/* Tools section */
.tools-section { margin-top: 16rpx; }
.section-header { display: flex; align-items: center; margin: 24rpx 0 16rpx; }
.section-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #4A6741; margin-right: 10rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #8B8680; letter-spacing: 1rpx; }

.tool-card {
  display: flex;
  align-items: center;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(45,42,38,0.04);
}
.tool-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.wrap-ai { background: rgba(74,103,65,0.1); }
.wrap-report { background: rgba(200,120,92,0.1); }
.wrap-history { background: rgba(107,126,154,0.1); }
.icon-svg { width: 28rpx; height: 28rpx; }
.tool-body { flex: 1; }
.tool-name { display: block; font-size: 28rpx; font-weight: 600; color: #2D2A26; }
.tool-desc { display: block; font-size: 24rpx; color: #8B8680; margin-top: 4rpx; }
.tool-arrow { font-size: 36rpx; color: #D4CFC7; margin-left: 8rpx; }

.sync-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #F5F0E8 0%, #FFFDF9 100%);
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
  border: 1rpx solid rgba(74, 103, 65, 0.1);
}

.sync-card.syncing { opacity: 0.6; }

.sync-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: rgba(74, 103, 65, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.sync-body { flex: 1; }
.sync-name { display: block; font-size: 28rpx; font-weight: 600; color: #2D2A26; }
.sync-desc { display: block; font-size: 24rpx; color: #8B8680; margin-top: 4rpx; }
.sync-arrow { font-size: 36rpx; color: #4A6741; margin-left: 8rpx; }
</style>
