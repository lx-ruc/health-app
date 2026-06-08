<template>
  <view class="history">
    <view v-if="habitStore.history.length === 0" class="empty">
      <text class="empty-text">暂无历史记录</text>
    </view>
    <view v-else class="list">
      <view v-for="item in habitStore.history" :key="item.date" class="history-item" @tap="showDetail(item)">
        <view class="item-header">
          <text class="item-date">{{ item.date }}</text>
          <text class="item-arrow">></text>
        </view>
        <view class="item-summary">
          <text v-if="item.sleep_time">睡眠 {{ item.sleep_time }}~{{ item.wake_time }}</text>
          <text v-if="item.exercise_type">{{ item.exercise_type }} {{ item.exercise_duration }}分钟</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHabitStore } from '../../stores/habit'

const habitStore = useHabitStore()

onMounted(() => {
  habitStore.fetchHistory()
})

function showDetail(item: any) {
  const lines = [
    `日期: ${item.date}`,
    item.sleep_time ? `睡眠: ${item.sleep_time} ~ ${item.wake_time}` : '',
    item.nap_duration ? `午休: ${item.nap_duration}分钟` : '',
    item.work_type ? `工作: ${item.work_type}` : '',
    item.breakfast ? `早餐: ${item.breakfast}` : '',
    item.lunch ? `午餐: ${item.lunch}` : '',
    item.dinner ? `晚餐: ${item.dinner}` : '',
    item.exercise_type ? `运动: ${item.exercise_type} ${item.exercise_duration}分钟` : '',
    item.steps ? `步数: ${item.steps}` : '',
  ].filter(Boolean).join('\n')

  uni.showModal({
    title: item.date,
    content: lines,
    showCancel: false,
  })
}
</script>

<style scoped>
.history {
  padding: 20rpx 30rpx;
  min-height: 100vh;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

.history-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-date {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.item-arrow {
  color: #ccc;
}

.item-summary {
  margin-top: 12rpx;
  display: flex;
  gap: 20rpx;
}

.item-summary text {
  font-size: 26rpx;
  color: #666;
}
</style>
