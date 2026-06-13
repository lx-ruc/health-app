<template>
  <view class="history-page">
    <view v-if="habitStore.history.length === 0" class="empty">
      <view class="empty-icon-wrap">
        <image class="icon-svg-lg" :src="getIcon('calendar', '#8B8680')" mode="aspectFit" />
      </view>
      <text class="empty-text">暂无历史记录</text>
    </view>

    <view v-else class="history-list">
      <view v-for="item in habitStore.history" :key="item.date" class="history-card" @tap="showDetail(item)">
        <view class="card-date-row">
          <text class="card-date">{{ item.date }}</text>
          <text class="card-arrow">›</text>
        </view>
        <view class="card-tags">
          <view v-if="item.sleep_time" class="tag">
            <text class="tag-text">睡眠 {{ item.sleep_time }}~{{ item.wake_time }}</text>
          </view>
          <view v-if="item.exercise_type" class="tag">
            <text class="tag-text">{{ item.exercise_type }} {{ item.exercise_duration }}分钟</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHabitStore } from '../../stores/habit'
import { getIcon } from '../../utils/icons'

const habitStore = useHabitStore()

onMounted(() => { habitStore.fetchHistory() })

function showDetail(item: any) {
  const lines = [
    item.sleep_time ? `睡眠: ${item.sleep_time} ~ ${item.wake_time}` : '',
    item.nap_duration ? `午休: ${item.nap_duration}分钟` : '',
    item.work_type ? `工作: ${item.work_type}` : '',
    item.breakfast ? `早餐: ${item.breakfast}` : '',
    item.lunch ? `午餐: ${item.lunch}` : '',
    item.dinner ? `晚餐: ${item.dinner}` : '',
    item.exercise_type ? `运动: ${item.exercise_type} ${item.exercise_duration}分钟` : '',
    item.steps ? `步数: ${item.steps}` : '',
  ].filter(Boolean).join('\n')

  uni.showModal({ title: item.date, content: lines, showCancel: false })
}
</script>

<style scoped>
.history-page {
  padding: 20rpx 30rpx;
  min-height: 100vh;
  background: #FAF7F2;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 150rpx;
}

.empty-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.icon-svg-lg { width: 40rpx; height: 40rpx; }

.empty-text {
  font-size: 28rpx;
  color: #8B8680;
}

.history-card {
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.card-date-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-date {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2A26;
}

.card-arrow {
  font-size: 32rpx;
  color: #D4CFC7;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.tag {
  background: #F5F0E8;
  padding: 6rpx 16rpx;
  border-radius: 10rpx;
}

.tag-text {
  font-size: 22rpx;
  color: #5A5650;
}
</style>
