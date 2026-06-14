<template>
  <view class="reminder-page">
    <view class="quota-card">
      <view class="quota-row">
        <text class="quota-label">每日打卡提醒</text>
        <text class="quota-value">{{ dailyRemaining }} 次</text>
      </view>
      <view class="quota-row">
        <text class="quota-label">每周指标提醒</text>
        <text class="quota-value">{{ weeklyRemaining }} 次</text>
      </view>
      <view class="quota-tip">每次推送消耗 1 次，授权次数用完需要重新点击下方按钮</view>
      <!-- #ifdef MP-WEIXIN -->
      <view class="quota-btn" @tap="onAuthClick">
        <text class="quota-btn-text">增加提醒次数</text>
      </view>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <view class="quota-btn disabled">
        <text class="quota-btn-text">请在微信中打开</text>
      </view>
      <!-- #endif -->
    </view>

    <view class="section-card">
      <view class="card-header">
        <text class="card-title">每日打卡提醒</text>
        <switch :checked="daily.enabled" color="#4A6741" @change="onDailyToggle" />
      </view>
      <text class="card-desc">每天固定时间提醒记录睡眠/饮食/运动习惯</text>
      <view v-if="daily.enabled" class="time-row">
        <text class="time-label">提醒时间</text>
        <picker mode="time" :value="daily.time" @change="onDailyTime">
          <text class="time-value">{{ daily.time }}</text>
        </picker>
      </view>
    </view>

    <view class="section-card">
      <view class="card-header">
        <text class="card-title">每周指标提醒</text>
        <switch :checked="weekly.enabled" color="#4A6741" @change="onWeeklyToggle" />
      </view>
      <text class="card-desc">每周指定日提醒记录体重/血压/血糖等</text>
      <view v-if="weekly.enabled">
        <view class="time-row">
          <text class="time-label">提醒时间</text>
          <picker mode="time" :value="weekly.time" @change="onWeeklyTime">
            <text class="time-value">{{ weekly.time }}</text>
          </picker>
        </view>
        <view class="days-row">
          <text class="time-label">提醒日</text>
          <view class="days-grid">
            <view
              v-for="(d, i) in WEEK_DAYS"
              :key="d"
              class="day-chip"
              :class="{ active: weekly.days.includes(i) }"
              @tap="toggleDay(i)"
            >
              <text>{{ d }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { get, put } from '../../api'
import { requestReminderAuth, type ReminderType } from '../../utils/subscribe'

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']

interface Config {
  type: ReminderType
  time: string
  days_of_week?: string | null
  enabled: number
  subscribe_remaining: number
}

const dailyRemaining = ref(0)
const weeklyRemaining = ref(0)
const daily = reactive({ enabled: false, time: '21:00' })
const weekly = reactive({ enabled: false, time: '08:00', days: [] as number[] })

let dailyLoaded = false
let weeklyLoaded = false

onMounted(fetchConfigs)

async function fetchConfigs() {
  try {
    const rows = (await get<Config[]>('/reminder-config')) || []
    for (const r of rows) {
      if (r.type === 'daily_habit') {
        daily.enabled = !!r.enabled
        daily.time = r.time || '21:00'
        dailyRemaining.value = r.subscribe_remaining || 0
        dailyLoaded = true
      } else if (r.type === 'weekly_metric') {
        weekly.enabled = !!r.enabled
        weekly.time = r.time || '08:00'
        weekly.days = (r.days_of_week || '').split(',').filter(Boolean).map(Number)
        weeklyRemaining.value = r.subscribe_remaining || 0
        weeklyLoaded = true
      }
    }
  } catch {}
}

let saveTimer: any = null
function scheduleSave(type: ReminderType) {
  if (type === 'daily_habit' && !dailyLoaded) return
  if (type === 'weekly_metric' && !weeklyLoaded) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveConfig(type), 500)
}

async function saveConfig(type: ReminderType) {
  const body: Partial<Config> =
    type === 'daily_habit'
      ? { type, time: daily.time, enabled: daily.enabled ? 1 : 0 }
      : {
          type,
          time: weekly.time,
          days_of_week: weekly.days.slice().sort().join(','),
          enabled: weekly.enabled ? 1 : 0,
        }
  try {
    await put('/reminder-config', body)
    uni.showToast({ title: '已保存', icon: 'none', duration: 800 })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function onDailyToggle(e: any) {
  daily.enabled = e.detail.value
  scheduleSave('daily_habit')
}
function onDailyTime(e: any) {
  daily.time = e.detail.value
  scheduleSave('daily_habit')
}
function onWeeklyToggle(e: any) {
  weekly.enabled = e.detail.value
  scheduleSave('weekly_metric')
}
function onWeeklyTime(e: any) {
  weekly.time = e.detail.value
  scheduleSave('weekly_metric')
}
function toggleDay(i: number) {
  const idx = weekly.days.indexOf(i)
  if (idx >= 0) weekly.days.splice(idx, 1)
  else weekly.days.push(i)
  scheduleSave('weekly_metric')
}

async function onAuthClick() {
  // 同时给两类提醒授权（用户在弹窗中分别选择）
  const tmplIds: string[] = []
  // 模板 ID 在 mp-weixin 后台申请后通过常量/全局配置注入；这里走运行时注入
  const DAILY_TPL = (uni as any).cloud?.config?.dailyHabitTpl || ''
  const WEEKLY_TPL = (uni as any).cloud?.config?.weeklyMetricTpl || ''
  if (DAILY_TPL) tmplIds.push(DAILY_TPL)
  if (WEEKLY_TPL) tmplIds.push(WEEKLY_TPL)
  if (tmplIds.length === 0) {
    uni.showToast({ title: '模板未配置', icon: 'none' })
    return
  }

  uni.showLoading({ title: '授权中...' })
  try {
    const r = await requestReminderAuth('daily_habit', tmplIds)
    await fetchConfigs()
    uni.hideLoading()
    if (r.accepted > 0) {
      uni.showToast({ title: `增加 ${r.accepted} 次`, icon: 'success' })
    } else {
      uni.showToast({ title: '未授权', icon: 'none' })
    }
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '授权失败', icon: 'none' })
  }
}
</script>

<style scoped>
.reminder-page {
  padding: 30rpx;
  min-height: 100vh;
  background: #faf7f2;
}

.quota-card {
  background: linear-gradient(135deg, #4a6741 0%, #5d7d52 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #fffdf9;
}
.quota-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.quota-label { font-size: 26rpx; opacity: 0.9; }
.quota-value { font-size: 32rpx; font-weight: 700; }
.quota-tip { font-size: 22rpx; opacity: 0.75; margin: 16rpx 0 20rpx; line-height: 1.5; }
.quota-btn {
  background: rgba(255, 253, 249, 0.18);
  border-radius: 16rpx;
  padding: 20rpx;
  text-align: center;
}
.quota-btn.disabled { opacity: 0.5; }
.quota-btn-text { font-size: 28rpx; color: #fffdf9; font-weight: 600; }

.section-card {
  background: #fffdf9;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.card-title { font-size: 30rpx; font-weight: 600; color: #2d2a26; }
.card-desc { font-size: 24rpx; color: #8b8680; display: block; margin-bottom: 20rpx; }

.time-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}
.time-label { font-size: 26rpx; color: #6b6660; width: 140rpx; }
.time-value { font-size: 30rpx; color: #4a6741; font-weight: 600; }

.days-row {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;
}
.days-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  flex: 1;
}
.day-chip {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #6b6660;
}
.day-chip.active {
  background: #4a6741;
  color: #fffdf9;
}
</style>
