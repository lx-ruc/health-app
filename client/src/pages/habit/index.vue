<template>
  <view class="habit-page">
    <view class="date-bar">
      <text class="date-label">今日</text>
      <text class="date-value">{{ today }}</text>
      <view v-if="hasRecord" class="recorded-pill">
        <text class="pill-text">已记录</text>
      </view>
    </view>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-header">
          <view class="section-dot dot-sleep" />
          <text class="section-title">作息</text>
        </view>
        <view class="form-row">
          <text class="form-label">入睡时间</text>
          <picker mode="time" :value="form.sleepTime" @change="onTimeChange('sleepTime', $event)">
            <text :class="['form-value', !form.sleepTime && 'placeholder']">{{ form.sleepTime || '选择' }}</text>
          </picker>
        </view>
        <view class="form-row">
          <text class="form-label">起床时间</text>
          <picker mode="time" :value="form.wakeTime" @change="onTimeChange('wakeTime', $event)">
            <text :class="['form-value', !form.wakeTime && 'placeholder']">{{ form.wakeTime || '选择' }}</text>
          </picker>
        </view>
        <view class="form-row">
          <text class="form-label">午休时长</text>
          <view class="input-inline">
            <input class="form-input" type="number" v-model="form.napDuration" placeholder="0" />
            <text class="input-unit">分钟</text>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header">
          <view class="section-dot dot-work" />
          <text class="section-title">工作</text>
        </view>
        <view class="tag-group">
          <view
            v-for="type in workTypes"
            :key="type"
            class="tag-item"
            :class="{ active: form.workType === type }"
            @tap="form.workType = type"
          >
            <text class="tag-text">{{ type }}</text>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header">
          <view class="section-dot dot-food" />
          <text class="section-title">饮食</text>
        </view>
        <view class="diet-field">
          <text class="diet-label">早餐</text>
          <textarea class="diet-input" v-model="form.breakfast" placeholder="面包、牛奶..." />
        </view>
        <view class="diet-field">
          <text class="diet-label">午餐</text>
          <textarea class="diet-input" v-model="form.lunch" placeholder="描述午餐内容..." />
        </view>
        <view class="diet-field">
          <text class="diet-label">晚餐</text>
          <textarea class="diet-input" v-model="form.dinner" placeholder="描述晚餐内容..." />
        </view>
      </view>

      <view class="form-section">
        <view class="section-header">
          <view class="section-dot dot-exercise" />
          <text class="section-title">运动</text>
        </view>
        <view class="form-row">
          <text class="form-label">运动类型</text>
          <input class="form-input flex-end" v-model="form.exerciseType" placeholder="跑步、爬坡..." />
        </view>
        <view class="form-row">
          <text class="form-label">运动时长</text>
          <view class="input-inline">
            <input class="form-input" type="number" v-model="form.exerciseDuration" placeholder="0" />
            <text class="input-unit">分钟</text>
          </view>
        </view>
        <view class="form-row no-border">
          <text class="form-label">步数</text>
          <input class="form-input flex-end" type="number" v-model="form.steps" placeholder="0" />
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <view class="submit-wrap">
      <view class="submit-btn" :class="{ loading: saving }" @tap="submit">
        <text class="submit-text">{{ saving ? '保存中...' : '保存今日习惯' }}</text>
      </view>
    </view>
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
  sleepTime: '', wakeTime: '', napDuration: '', workType: '',
  breakfast: '', lunch: '', dinner: '',
  exerciseType: '', exerciseDuration: '', steps: '',
})

onMounted(() => {
  habitStore.fetchToday()
  if (habitStore.todayHabit) {
    const h = habitStore.todayHabit
    form.value = {
      sleepTime: h.sleep_time || '', wakeTime: h.wake_time || '',
      napDuration: h.nap_duration ? String(h.nap_duration) : '',
      workType: h.work_type || '', breakfast: h.breakfast || '',
      lunch: h.lunch || '', dinner: h.dinner || '',
      exerciseType: h.exercise_type || '',
      exerciseDuration: h.exercise_duration ? String(h.exercise_duration) : '',
      steps: h.steps ? String(h.steps) : '',
    }
  }
})

function onTimeChange(key: keyof typeof form.value, e: any) { form.value[key] = e.detail.value }

async function submit() {
  saving.value = true
  try {
    await habitStore.saveHabit({
      sleepTime: form.value.sleepTime || undefined, wakeTime: form.value.wakeTime || undefined,
      napDuration: Number(form.value.napDuration) || 0, workType: form.value.workType || undefined,
      breakfast: form.value.breakfast || undefined, lunch: form.value.lunch || undefined,
      dinner: form.value.dinner || undefined, exerciseType: form.value.exerciseType || undefined,
      exerciseDuration: Number(form.value.exerciseDuration) || 0, steps: Number(form.value.steps) || 0,
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
  background: #FAF7F2;
}

.date-bar {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  background: #FFFDF9;
  border-bottom: 1rpx solid #EDE8DF;
}

.date-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D2A26;
}

.date-value {
  font-size: 26rpx;
  color: #8B8680;
  margin-left: 16rpx;
}

.recorded-pill {
  margin-left: auto;
  background: rgba(74, 103, 65, 0.1);
  padding: 6rpx 18rpx;
  border-radius: 16rpx;
}

.pill-text {
  font-size: 22rpx;
  color: #4A6741;
  font-weight: 500;
}

.form-scroll {
  flex: 1;
  padding: 24rpx 30rpx;
}

.form-section {
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
  margin-right: 12rpx;
}

.dot-sleep { background: #6B7E9A; }
.dot-work { background: #C8785C; }
.dot-food { background: #8B9E7E; }
.dot-exercise { background: #B8956A; }

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2A26;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}

.form-row.no-border {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #5A5650;
}

.form-value {
  font-size: 28rpx;
  color: #2D2A26;
  font-weight: 500;
}

.form-value.placeholder {
  color: #B8B3AC;
}

.form-input {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 28rpx;
  color: #2D2A26;
}

.flex-end {
  text-align: right;
}

.input-inline {
  display: flex;
  align-items: center;
}

.input-unit {
  font-size: 24rpx;
  color: #8B8680;
  margin-left: 8rpx;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.tag-item {
  padding: 14rpx 28rpx;
  border-radius: 16rpx;
  background: #F5F0E8;
}

.tag-item.active {
  background: rgba(74, 103, 65, 0.1);
  border: 1rpx solid #4A6741;
}

.tag-text {
  font-size: 26rpx;
  color: #5A5650;
}

.active .tag-text {
  color: #4A6741;
  font-weight: 500;
}

.diet-field {
  margin-bottom: 16rpx;
}

.diet-label {
  font-size: 26rpx;
  color: #8B8680;
  display: block;
  margin-bottom: 8rpx;
}

.diet-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 100rpx;
  font-size: 28rpx;
  padding: 16rpx;
  background: #FAF7F2;
  border-radius: 16rpx;
  color: #2D2A26;
  border: 1rpx solid #EDE8DF;
}

.bottom-space {
  height: 120rpx;
}

.submit-wrap {
  padding: 16rpx 30rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #FFFDF9;
  border-top: 1rpx solid #EDE8DF;
}

.submit-btn {
  height: 88rpx;
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
