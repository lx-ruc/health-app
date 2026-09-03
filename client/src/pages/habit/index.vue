<template>
  <view class="habit-page">
    <view class="date-bar">
      <text class="date-text">{{ today }}</text>
      <text v-if="hasRecord" class="tag-state ok">已录入</text>
    </view>

    <scroll-view scroll-y class="form-scroll">
      <!-- 睡眠 -->
      <view class="sheet form-section">
        <text class="eyebrow section-eyebrow">作息</text>
        <view class="form-item">
          <text class="item-label">睡眠时间</text>
          <picker mode="time" :value="form.sleepTime" @change="onTimeChange('sleepTime', $event)">
            <view class="item-picker">
              <text :class="['item-value', 'num', !form.sleepTime && 'empty']">{{ form.sleepTime || '选择' }}</text>
              <text class="item-caret">›</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="item-label">起床时间</text>
          <picker mode="time" :value="form.wakeTime" @change="onTimeChange('wakeTime', $event)">
            <view class="item-picker">
              <text :class="['item-value', 'num', !form.wakeTime && 'empty']">{{ form.wakeTime || '选择' }}</text>
              <text class="item-caret">›</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="item-label">午休时长（分钟）</text>
          <input class="item-input num" type="number" v-model="form.napDuration" placeholder="0" placeholder-class="ph" />
        </view>
      </view>

      <!-- 工作 -->
      <view class="sheet form-section">
        <text class="eyebrow section-eyebrow">工作</text>
        <view class="work-types">
          <view
            v-for="type in workTypes"
            :key="type"
            class="chip"
            :class="{ active: form.workType === type }"
            hover-class="press"
            @tap="form.workType = type"
          >
            <text>{{ type }}</text>
          </view>
        </view>
      </view>

      <!-- 饮食 -->
      <view class="sheet form-section">
        <text class="eyebrow section-eyebrow">饮食</text>
        <view class="form-item vertical">
          <text class="item-label">早餐</text>
          <textarea class="item-textarea" v-model="form.breakfast" placeholder="吃了什么，吃了多少…" placeholder-class="ph" />
        </view>
        <view class="form-item vertical">
          <text class="item-label">午餐</text>
          <textarea class="item-textarea" v-model="form.lunch" placeholder="吃了什么，吃了多少…" placeholder-class="ph" />
        </view>
        <view class="form-item vertical">
          <text class="item-label">晚餐</text>
          <textarea class="item-textarea" v-model="form.dinner" placeholder="吃了什么，吃了多少…" placeholder-class="ph" />
        </view>
      </view>

      <!-- 运动 -->
      <view class="sheet form-section">
        <text class="eyebrow section-eyebrow">运动</text>
        <view class="form-item">
          <text class="item-label">运动类型</text>
          <input class="item-input" v-model="form.exerciseType" placeholder="如：跑步、爬坡" placeholder-class="ph" />
        </view>
        <view class="form-item">
          <text class="item-label">运动时长（分钟）</text>
          <input class="item-input num" type="number" v-model="form.exerciseDuration" placeholder="0" placeholder-class="ph" />
        </view>
        <view class="form-item last">
          <text class="item-label">步数</text>
          <input class="item-input num" type="number" v-model="form.steps" placeholder="0" placeholder-class="ph" />
        </view>
      </view>
    </scroll-view>

    <view class="submit-wrap">
      <button class="btn-primary submit-btn" :loading="saving" @tap="submit">保存今日习惯</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHabitStore } from '../../stores/habit'
import { WORK_TYPE_OPTIONS } from '../../utils/constants'
import { toChinaDateStr } from '../../utils/date'

const habitStore = useHabitStore()
const workTypes = [...WORK_TYPE_OPTIONS]
const saving = ref(false)

const today = toChinaDateStr()
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

function onTimeChange(key: 'sleepTime' | 'wakeTime', e: any) {
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
}

/* ---- 日期条 ---- */
.date-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}

.date-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
}

/* ---- 表单 ---- */
.form-scroll {
  flex: 1;
  padding: 4rpx 32rpx 20rpx;
  box-sizing: border-box;
}

.form-section {
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
}

.form-section:first-child {
  margin-top: 4rpx;
}

.section-eyebrow {
  margin-bottom: 20rpx;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.form-item.last {
  border-bottom: none;
}

.form-item.vertical {
  flex-direction: column;
  align-items: flex-start;
}

.item-label {
  font-size: 28rpx;
  color: var(--t2);
}

.item-picker {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.item-value {
  font-size: 30rpx;
  color: var(--ink);
  font-weight: 500;
}

.item-value.empty {
  color: var(--t3);
  font-weight: 400;
}

.item-caret {
  font-size: 28rpx;
  color: var(--t3);
}

.item-input {
  flex: 1;
  text-align: right;
  font-size: 30rpx;
  color: var(--t1);
  margin-left: 24rpx;
}

.item-textarea {
  width: 100%;
  height: 130rpx;
  font-size: 27rpx;
  color: var(--t1);
  margin-top: 14rpx;
  padding: 18rpx 20rpx;
  background: var(--paper);
  border-radius: 14rpx;
  box-sizing: border-box;
}

.ph {
  color: var(--t3);
}

.work-types {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

/* ---- 提交 ---- */
.submit-wrap {
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}

.submit-btn {
  width: 100%;
}
</style>
