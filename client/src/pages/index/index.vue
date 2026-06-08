<template>
  <view class="home">
    <view class="greeting">
      <text class="greeting-text">今日健康概览</text>
      <text class="date-text">{{ today }}</text>
    </view>

    <!-- 习惯录入状态 -->
    <view class="card" @tap="goHabit">
      <view class="card-header">
        <text class="card-title">今日习惯</text>
        <text class="card-arrow">></text>
      </view>
      <text :class="['card-status', habitStore.todayHabit ? 'done' : 'pending']">
        {{ habitStore.todayHabit ? '已录入' : '未录入' }}
      </text>
      <view v-if="habitStore.todayHabit" class="card-detail">
        <text>睡眠 {{ habitStore.todayHabit.sleep_time || '-' }} ~ {{ habitStore.todayHabit.wake_time || '-' }}</text>
      </view>
    </view>

    <!-- 指标打卡 -->
    <view class="card" @tap="goMetrics">
      <view class="card-header">
        <text class="card-title">指标打卡</text>
        <text class="card-arrow">></text>
      </view>
      <text class="card-status pending">{{ metricStore.selectedMetrics.length }} 项追踪中</text>
    </view>

    <!-- 快捷入口 -->
    <view class="shortcuts">
      <view class="shortcut-item" @tap="goAnalysis">
        <view class="shortcut-icon ai">AI</view>
        <text class="shortcut-label">AI 分析</text>
      </view>
      <view class="shortcut-item" @tap="goReport">
        <view class="shortcut-icon report">报</view>
        <text class="shortcut-label">体检报告</text>
      </view>
      <view class="shortcut-item" @tap="goHistory">
        <view class="shortcut-icon history">历</view>
        <text class="shortcut-label">历史记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHabitStore } from '../../stores/habit'
import { useMetricStore } from '../../stores/metric'

const habitStore = useHabitStore()
const metricStore = useMetricStore()

const today = new Date().toISOString().slice(0, 10)

onMounted(() => {
  habitStore.fetchToday()
  metricStore.fetchConfig()
})

function goHabit() { uni.switchTab({ url: '/pages/habit/index' }) }
function goMetrics() { uni.switchTab({ url: '/pages/metrics/index' }) }
function goAnalysis() { uni.switchTab({ url: '/pages/analysis/index' }) }
function goReport() { uni.navigateTo({ url: '/pages/report/index' }) }
function goHistory() { uni.navigateTo({ url: '/pages/history/index' }) }
</script>

<style scoped>
.home {
  padding: 30rpx;
  min-height: 100vh;
}

.greeting {
  margin-bottom: 40rpx;
}

.greeting-text {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.date-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.card-arrow {
  color: #ccc;
}

.card-status {
  font-size: 26rpx;
  margin-top: 12rpx;
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.card-status.done {
  color: #07C160;
  background: #e8f5e9;
}

.card-status.pending {
  color: #ff9800;
  background: #fff3e0;
}

.card-detail {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #666;
}

.shortcuts {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.shortcut-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 0;
}

.shortcut-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.shortcut-icon.ai { background: linear-gradient(135deg, #667eea, #764ba2); }
.shortcut-icon.report { background: linear-gradient(135deg, #f093fb, #f5576c); }
.shortcut-icon.history { background: linear-gradient(135deg, #4facfe, #00f2fe); }

.shortcut-label {
  font-size: 26rpx;
  color: #666;
}
</style>
