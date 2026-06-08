<template>
  <view class="habit-page">
    <view class="date-bar">
      <text class="date-text">{{ today }}</text>
      <text v-if="hasRecord" class="recorded-tag">已录入</text>
    </view>

    <scroll-view scroll-y class="form-scroll">
      <!-- 睡眠 -->
      <view class="form-section">
        <text class="section-title">作息</text>
        <view class="form-item">
          <text class="item-label">睡眠时间</text>
          <picker mode="time" :value="form.sleepTime" @change="onTimeChange('sleepTime', $event)">
            <text class="item-value">{{ form.sleepTime || '选择时间' }}</text>
          </picker>
        </view>
        <view class="form-item">
          <text class="item-label">起床时间</text>
          <picker mode="time" :value="form.wakeTime" @change="onTimeChange('wakeTime', $event)">
            <text class="item-value">{{ form.wakeTime || '选择时间' }}</text>
          </picker>
        </view>
        <view class="form-item">
          <text class="item-label">午休时长(分钟)</text>
          <input class="item-input" type="number" v-model="form.napDuration" placeholder="0" />
        </view>
      </view>

      <!-- 工作 -->
      <view class="form-section">
        <text class="section-title">工作</text>
        <view class="work-types">
          <view
            v-for="type in workTypes"
            :key="type"
            class="type-tag"
            :class="{ active: form.workType === type }"
            @tap="form.workType = type"
          >
            <text>{{ type }}</text>
          </view>
        </view>
      </view>

      <!-- 饮食 -->
      <view class="form-section">
        <text class="section-title">饮食</text>
        <view class="form-item vertical">
          <text class="item-label">早餐</text>
          <textarea class="item-textarea" v-model="form.breakfast" placeholder="描述早餐内容..." />
        </view>
        <view class="form-item vertical">
          <text class="item-label">午餐</text>
          <textarea class="item-textarea" v-model="form.lunch" placeholder="描述午餐内容..." />
        </view>
        <view class="form-item vertical">
          <text class="item-label">晚餐</text>
          <textarea class="item-textarea" v-model="form.dinner" placeholder="描述晚餐内容..." />
        </view>
      </view>

      <!-- 运动 -->
      <view class="form-section">
        <text class="section-title">运动</text>
        <view class="form-item">
          <text class="item-label">运动类型</text>
          <input class="item-input" v-model="form.exerciseType" placeholder="如: 跑步、爬坡" />
        </view>
        <view class="form-item">
          <text class="item-label">运动时长(分钟)</text>
          <input class="item-input" type="number" v-model="form.exerciseDuration" placeholder="0" />
        </view>
        <view class="form-item">
          <text class="item-label">步数</text>
          <input class="item-input" type="number" v-model="form.steps" placeholder="0" />
        </view>
      </view>
    </scroll-view>

    <button class="submit-btn" :loading="saving" @tap="submit">保存今日习惯</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHabitStore } from '../../stores/habit'
import { WORK_TYPE_OPTIONS } from '../../utils/constants'

const habitStore = useHabitStore()
const workTypes = [...WORK_TYPE_OPTIONS]
const saving = ref(false)

const today = new Date().toISOString().slice(0, 10)
const hasRecord = computed(() => !!habitStore.todayHabit)

const form = ref({
  sleepTime: '',
  wakeTime: '',
  napDuration: '',
  workType: '',
  breakfast: '',
  lunch: '',
  dinner: '',
  exerciseType: '',
  exerciseDuration: '',
  steps: '',
})

onMounted(() => {
  habitStore.fetchToday()
  if (habitStore.todayHabit) {
    const h = habitStore.todayHabit
    form.value = {
      sleepTime: h.sleep_time || '',
      wakeTime: h.wake_time || '',
      napDuration: h.nap_duration ? String(h.nap_duration) : '',
      workType: h.work_type || '',
      breakfast: h.breakfast || '',
      lunch: h.lunch || '',
      dinner: h.dinner || '',
      exerciseType: h.exercise_type || '',
      exerciseDuration: h.exercise_duration ? String(h.exercise_duration) : '',
      steps: h.steps ? String(h.steps) : '',
    }
  }
})

function onTimeChange(key: string, e: any) {
  form.value[key] = e.detail.value
}

async function submit() {
  saving.value = true
  try {
    await habitStore.saveHabit({
      sleepTime: form.value.sleepTime || undefined,
      wakeTime: form.value.wakeTime || undefined,
      napDuration: Number(form.value.napDuration) || 0,
      workType: form.value.workType || undefined,
      breakfast: form.value.breakfast || undefined,
      lunch: form.value.lunch || undefined,
      dinner: form.value.dinner || undefined,
      exerciseType: form.value.exerciseType || undefined,
      exerciseDuration: Number(form.value.exerciseDuration) || 0,
      steps: Number(form.value.steps) || 0,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.habit-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.date-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.date-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.recorded-tag {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #07C160;
  background: #e8f5e9;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.form-scroll {
  flex: 1;
  padding: 20rpx 30rpx;
}

.form-section {
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
  margin-bottom: 20rpx;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item.vertical {
  flex-direction: column;
  align-items: flex-start;
}

.item-label {
  font-size: 28rpx;
  color: #666;
  min-width: 160rpx;
}

.item-value {
  font-size: 28rpx;
  color: #333;
}

.item-input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  margin-left: 20rpx;
}

.item-textarea {
  width: 100%;
  height: 120rpx;
  font-size: 28rpx;
  margin-top: 10rpx;
  padding: 10rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.work-types {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-tag {
  padding: 12rpx 28rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
}

.type-tag.active {
  background: #e8f5e9;
  color: #07C160;
}

.submit-btn {
  margin: 20rpx 30rpx 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #07C160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
}
</style>
